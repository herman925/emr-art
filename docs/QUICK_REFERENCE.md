# Flux API Quick Reference Guide

## 🚀 Quick Start

### 1. Get API Key
1. Visit https://dashboard.bfl.ai
2. Register and confirm email
3. Navigate to **API → Keys**
4. Click **Add Key**
5. **Copy immediately** (only shown once!)

### 2. Add Credits
- Go to **API → Credits**
- Click **Add Credits**
- Pay via Stripe
- **1 credit = $0.01 USD**

### 3. First API Call

```python
import os
import requests
import time

api_key = os.environ.get("BFL_API_KEY")

# Submit request
response = requests.post(
    'https://api.bfl.ai/v1/flux-2-pro',
    headers={
        'accept': 'application/json',
        'x-key': api_key,
        'Content-Type': 'application/json',
    },
    json={
        'prompt': 'A serene landscape with mountains',
        'width': 1440,
        'height': 2048
    }
)

data = response.json()
polling_url = data['polling_url']

# Poll for result
while True:
    time.sleep(0.5)
    result = requests.get(
        polling_url,
        headers={'accept': 'application/json', 'x-key': api_key}
    ).json()
    
    if result['status'] == 'Ready':
        print(f"Image ready: {result['result']['sample']}")
        break
```

## 🎯 Model Selection Quick Guide

| Use Case | Recommended Model | Price | Why |
|----------|------------------|-------|-----|
| **Production Apps** | FLUX.2 [pro] | from $0.03 | Best balance of quality/speed |
| **High Volume** | FLUX.2 [klein] 4B | from $0.014 | Lowest cost |
| **Maximum Quality** | FLUX.2 [flex] | $0.05 | Highest quality output |
| **Image Editing** | FLUX.1 Kontext [pro] | $0.04 | Text-based editing |
| **Ultra-High Res** | FLUX1.1 [pro] Ultra | $0.06 | Up to 4MP images |
| **Development** | FLUX.2 [dev] | Free | Local, non-commercial |

## 📡 API Endpoints

### Primary Endpoint
```
https://api.bfl.ai
```
- Global load balancing
- Automatic failover
- **Always use polling_url from response**

### Regional Endpoints
- **EU:** `https://api.eu.bfl.ai` (GDPR compliant)
- **US:** `https://api.us.bfl.ai`

## ⚠️ Critical Limits

| Limit Type | Value | Action |
|------------|-------|--------|
| **Concurrent Requests** | 24 max | Implement queue |
| **Kontext Max** | 6 max | Lower concurrency |
| **Image Expiration** | 10 minutes | Download immediately |
| **CORS** | Not supported | Download & re-serve |

## 🛠️ Best Practices Checklist

- [ ] Store API key in environment variables
- [ ] Use global endpoint `api.bfl.ai`
- [ ] Implement exponential backoff for 429 errors
- [ ] Download images immediately upon completion
- [ ] Store images in your own infrastructure/CDN
- [ ] Handle all status types (Ready, Error, Failed)
- [ ] Monitor credit balance
- [ ] Implement proper error handling for 402 (insufficient credits)
- [ ] Use descriptive API key names
- [ ] Test with small images first

## 💰 Pricing Quick Reference

### FLUX.2 (Megapixel-based)
- **Klein 4B:** from $0.014/image
- **Klein 9B:** from $0.015/image
- **Pro:** from $0.030/image
- **Flex:** $0.050/image

### FLUX.1 (Fixed pricing)
- **Kontext Pro:** $0.04/image
- **Kontext Max:** $0.08/image
- **1.1 Pro:** $0.04/image
- **1.1 Pro Ultra:** $0.06/image
- **Fill Pro:** $0.05/image

**Note:** Batch requests multiply cost by number of images.

## 🔧 Common Parameters

### Required
- `prompt` (string): Text description of desired image

### Optional
- `width` (integer): Image width (default varies by model)
- `height` (integer): Image height (default varies by model)
- `seed` (integer): For reproducibility
- `steps` (integer): Number of generation steps (15-50)
- `guidance` (float): Guidance scale (1.5-10)
- `safety_tolerance` (integer): 0-6 (0=strict, 6=lenient)
- `output_format` (string): "jpeg" or "png"

## 📊 Response Format

### Initial Request
```json
{
  "id": "request_id_here",
  "polling_url": "https://...",
  "cost": 0.03,
  "input_mp": 2.95,
  "output_mp": 2.95
}
```

### Polling Result
```json
{
  "status": "Ready",
  "result": {
    "sample": "https://delivery-eu.bfl.ai/..."
  }
}
```

## 🐛 Common Errors

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| **402** | Insufficient credits | Add credits at dashboard.bfl.ai |
| **429** | Rate limit exceeded | Wait and retry with exponential backoff |
| **422** | Validation error | Check input parameters |
| **500-503** | Server error | Retry with exponential backoff |

## 📚 Useful Links

- **Documentation:** https://docs.bfl.ml
- **API Reference:** https://api.bfl.ai/openapi.json
- **Playground:** https://playground.bfl.ai
- **Pricing:** https://bfl.ai/pricing
- **Dashboard:** https://dashboard.bfl.ai
- **Support:** flux@blackforestlabs.ai
- **GitHub:** https://github.com/black-forest-labs/flux

## 🎨 Prompting Tips

1. **Be specific:** "A golden retriever puppy sitting on a red blanket in a sunny park" > "A dog"
2. **Include style:** "in the style of impressionist painting" or "photorealistic"
3. **Specify lighting:** "golden hour lighting", "dramatic shadows"
4. **Add details:** "highly detailed", "8k resolution", "professional photography"
5. **Use composition terms:** "close-up shot", "wide angle", "bird's eye view"

## 🔐 Security Reminders

- ✅ Store API keys in environment variables
- ✅ Use different keys for dev/staging/production
- ✅ Regenerate keys if compromised
- ❌ Never commit keys to git
- ❌ Never expose keys in client-side code
- ❌ Never share keys publicly

---

**Last Updated:** February 26, 2026  
**Version:** 1.0
