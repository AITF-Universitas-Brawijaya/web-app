"""
SerpAPI Service Utility
Handles SerpAPI integration for keyword generation and quota checking
"""
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, List


def get_serpapi_key(db: Session) -> Optional[str]:
    """
    Retrieve SerpAPI key from database
    
    Args:
        db: Database session
        
    Returns:
        API key string or None if not configured
    """
    try:
        query = text("""
            SELECT setting_value 
            FROM generator_settings 
            WHERE setting_key = 'serpapi_key'
        """)
        result = db.execute(query).fetchone()
        
        if result:
            key = dict(result._mapping)["setting_value"]
            return key if key else None
        return None
    except Exception as e:
        print(f"Error fetching SerpAPI key: {e}")
        return None


def get_serpapi_quota(api_key: str) -> Dict:
    """
    Fetch quota information from SerpAPI account endpoint
    
    Args:
        api_key: SerpAPI key
        
    Returns:
        Dictionary with quota information: {used, limit, remaining}
        
    Raises:
        Exception if API call fails
    """
    try:
        url = "https://serpapi.com/account.json"
        params = {"api_key": api_key}
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract quota information
        used = data.get("this_month_usage", 0)
        limit = data.get("plan_searches_left", 0) + used  # Total limit
        remaining = data.get("plan_searches_left", 0)
        
        return {
            "used": used,
            "limit": limit,
            "remaining": remaining
        }
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch SerpAPI quota: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing SerpAPI quota: {str(e)}")


def generate_keywords(keyword: str, api_key: str) -> List[str]:
    """
    Call SerpAPI Google Trends Related Queries endpoint and return rising queries
    
    Args:
        keyword: Base keyword to search for related queries
        api_key: SerpAPI key
        
    Returns:
        List of related keywords (rising queries)
        
    Raises:
        Exception if API call fails
    """
    try:
        url = "https://serpapi.com/search.json"
        params = {
            "engine": "google_trends",
            "q": keyword,
            "data_type": "RELATED_QUERIES",
            "api_key": api_key
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract rising queries
        keywords = []
        
        # Check if related_queries exists
        if "related_queries" in data:
            rising = data["related_queries"].get("rising", [])
            
            # Extract query text from rising queries
            for item in rising:
                if isinstance(item, dict) and "query" in item:
                    keywords.append(item["query"])
        
        # If no rising queries found, return the original keyword
        if not keywords:
            keywords = [keyword]
        
        return keywords
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch keywords from SerpAPI: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing SerpAPI response: {str(e)}")
