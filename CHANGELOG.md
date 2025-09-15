# Changelog
## 1.2.2 (2025-09-15)
- added an endpoint to trigger manually a job. This is mainly for debug purpose but could be included to the dashboard if necessary.
  Example in curl:
    ```
    curl -X POST "http://localhost/run-scheduled-job?uri=https://example.com/job" \
     -H "Content-Type: application/json" 
    ```