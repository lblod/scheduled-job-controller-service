# Changelog
## 1.2.2 (2025-09-15)
- added an endpoint to trigger manually a job. This is mainly for debug purpose but could be included to the dashboard if necessary.
  Example in curl:
    ```
    docker compose exec scheduled-job-controller curl -v -X POST http://localhost/run-scheduled-job?uri=http://redpencil.data.gift/id/scheduled-job/c2ffa700-e462-46b4-abf5-103d1a1854d0 -H "Content-Type: application/json"
    ```