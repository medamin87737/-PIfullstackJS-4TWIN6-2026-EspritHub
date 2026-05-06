# AI Service Deployment Notes

## Render Cold Start Behavior

This service lazy-loads the SBERT model (`paraphrase-multilingual-MiniLM-L12-v2`) on the first `/recommend` request to reduce startup memory usage.

- `/health` will report `"model_loaded": false` immediately after deploy/restart.
- The first `/recommend` call may take around 30 seconds while the model loads.
- After that, `/health` should report `"model_loaded": true` while the instance stays warm.
