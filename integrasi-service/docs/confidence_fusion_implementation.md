# Confidence Fusion Implementation

## Overview
Implemented a fusion-based confidence calculation that combines object detection and reasoning confidences with equal weights (50-50).

## Key Changes

### 1. Reasoning Confidence Inversion
When the reasoning API returns a label of "non-judi" (non-gambling), the confidence score is inverted to align with the gambling detection scale:

```python
if reasoning_label_str == 'non_judi':
    reasoning_confidence_score = round(100 - reasoning_confidence_raw, 1)
else:
    reasoning_confidence_score = reasoning_confidence_raw
```

**Example:**
- If reasoning says "non-judi" with 95% confidence → inverted to 5% (indicating 5% gambling probability)
- If reasoning says "judi" with 80% confidence → stays 80% (indicating 80% gambling probability)

### 2. Fusion Calculation
The final confidence is calculated as a weighted average of both models:

```python
final_confidence = (detection_confidence * 0.5) + (reasoning_confidence * 0.5)
```

**Example:**
- Detection: 70% gambling
- Reasoning: 90% non-judi → inverted to 10% gambling
- Final: (70 * 0.5) + (10 * 0.5) = 40% gambling confidence

### 3. Fallback Logic
If only one model is available, that confidence is used:
- If only detection available → use detection confidence
- If only reasoning available → use reasoning confidence (already inverted if non-judi)
- If neither available → final_confidence = None

## Database Storage

### Object Detection Table
Stores the raw detection confidence as returned by the API (prob_fusion).

### Reasoning Table
Stores the **inverted** confidence for non-judi cases, so it's aligned with the gambling detection scale.

### Results Table
Stores the **fused** final_confidence calculated from both models.

## Logging
Added fusion logging to track the calculation:
```
[FUSION] Detection: 70.0%, Reasoning: 10.0% → Final: 40.0%
```

## Benefits
1. **Balanced Decision**: Combines visual detection and content analysis
2. **Consistent Scale**: All confidences represent gambling probability (0-100%)
3. **Robust**: Falls back gracefully when one model fails
4. **Transparent**: Logs show individual and fused scores
