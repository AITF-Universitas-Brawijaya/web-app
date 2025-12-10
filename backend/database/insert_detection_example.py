"""
Example script showing how to integrate object detection API response with the database.

This script demonstrates:
1. Receiving API response from object detection service
2. Transforming the data to match database schema
3. Inserting data into the object_detection table
"""

import psycopg2
from psycopg2.extras import Json
import os


def transform_api_response(api_response, id_domain):
    """
    Transform API response to match database schema.
    
    Args:
        api_response: Dict containing the API response
        id_domain: The domain ID to associate with this detection
        
    Returns:
        Dict with transformed data ready for database insertion
    """
    result = api_response.get('result', {})
    
    # Map status to boolean label
    status = result.get('status', '')
    label = True if status == 'gambling' else False
    
    # Round confidence score to 1 decimal place
    confidence = result.get('classification_confidence', 0.0)
    confidence_score = round(confidence, 1)
    
    # Prepend path to visualization_path
    visualization_path = result.get('visualization_path', '')
    if visualization_path:
        # Remove leading slash if present
        visualization_path = visualization_path.lstrip('/')
        image_detected_path = f"~/tim5_prd_workdir/{visualization_path}"
    else:
        image_detected_path = None
    
    return {
        'id_detection': result.get('id'),
        'id_domain': id_domain,
        'label': label,
        'confidence_score': confidence_score,
        'image_detected_path': image_detected_path,
        'bounding_box': result.get('detections', []),
        'ocr': result.get('ocr', []),
        'model_version': None,  # Set this if you have model version info
    }


def insert_detection_result(conn, detection_data):
    """
    Insert detection result into the database.
    
    Args:
        conn: psycopg2 connection object
        detection_data: Dict with transformed detection data
    """
    cursor = conn.cursor()
    
    query = """
        INSERT INTO object_detection (
            id_detection,
            id_domain,
            label,
            confidence_score,
            image_detected_path,
            bounding_box,
            ocr,
            model_version
        ) VALUES (
            %(id_detection)s,
            %(id_domain)s,
            %(label)s,
            %(confidence_score)s,
            %(image_detected_path)s,
            %(bounding_box)s,
            %(ocr)s,
            %(model_version)s
        )
        ON CONFLICT (id_domain) DO UPDATE SET
            id_detection = EXCLUDED.id_detection,
            label = EXCLUDED.label,
            confidence_score = EXCLUDED.confidence_score,
            image_detected_path = EXCLUDED.image_detected_path,
            bounding_box = EXCLUDED.bounding_box,
            ocr = EXCLUDED.ocr,
            model_version = EXCLUDED.model_version,
            processed_at = now()
    """
    
    # Convert lists to JSON for JSONB columns
    params = detection_data.copy()
    params['bounding_box'] = Json(params['bounding_box'])
    params['ocr'] = Json(params['ocr'])
    
    cursor.execute(query, params)
    conn.commit()
    cursor.close()


# Example usage
if __name__ == "__main__":
    # Example API response
    api_response = {
        "success": True,
        "result": {
            "status": "gambling",
            "classification_confidence": 0.9955,
            "detections": [
                {
                    "class": "game_thumbnail",
                    "confidence": 0.23614300787448883,
                    "bbox": [1253.609619140625, 540.1837768554688, 1437.677978515625, 773.6795654296875]
                },
                {
                    "class": "cta_button",
                    "confidence": 0.19455280900001526,
                    "bbox": [961.9973754882812, 467.9049377441406, 1197.007568359375, 512.834716796875]
                }
            ],
            "ocr": [
                {
                    "class": "banner_promo",
                    "bbox": [458.8593444824219, 76.31584167480469, 1453.1109619140625, 448.5144348144531],
                    "ocr_text": "SEWU88SLOT Rt? SUPERS Menjand AUTO BADAI SCATTER INS Tooo00X"
                }
            ],
            "visualization_path": "/results/inference/af49d35a-6987-4489-981f-bdeeda785cc1.jpg",
            "id": "294c7296-d41f-4056-a2ae-d9908b4820c6",
            "timestamp": "2025-11-24T16:25:54.022529"
        }
    }
    
    # Transform the data
    id_domain = 1  # Example domain ID
    detection_data = transform_api_response(api_response, id_domain)
    
    print("Transformed data:")
    print(f"  id_detection: {detection_data['id_detection']}")
    print(f"  label: {detection_data['label']}")
    print(f"  confidence_score: {detection_data['confidence_score']}")
    print(f"  image_detected_path: {detection_data['image_detected_path']}")
    print(f"  bounding_box: {len(detection_data['bounding_box'])} detections")
    print(f"  ocr: {len(detection_data['ocr'])} OCR results")
    
    # Database connection example (uncomment to use)
    # conn = psycopg2.connect(
    #     host=os.getenv('DB_HOST', 'localhost'),
    #     database=os.getenv('DB_NAME', 'your_database'),
    #     user=os.getenv('DB_USER', 'your_user'),
    #     password=os.getenv('DB_PASSWORD', 'your_password')
    # )
    # 
    # try:
    #     insert_detection_result(conn, detection_data)
    #     print("Data inserted successfully!")
    # finally:
    #     conn.close()
