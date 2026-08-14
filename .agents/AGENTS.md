# CRITICAL PRODUCTION SAFETY RULES

Before making ANY code changes:

1. Never delete, reset, replace, or recreate the production database.
2. Never modify production data unless explicitly requested.
3. Never change database configuration or storage paths.
4. Never replace environment variables (.env).
5. Never overwrite uploaded media or storage folders.
6. Never generate demo, mock, sample, or fake data.
7. Never create seed data automatically.
8. Before editing, identify every file that will change and explain why.
9. If any change could affect production data, STOP and ask for confirmation.
10. Never rewrite the entire project for a small feature.
11. Only edit the minimum number of files required.
12. Assume the database contains irreplaceable real data.
13. GitHub must contain only source code. Production data must remain separate and persistent.
14. Every update must preserve 100% of existing series, episodes, users, comments, subscriptions, watch history, view counts, thumbnails, and Rumble embed links.
15. After implementing changes, verify that all existing data is still accessible before considering the task complete.
16. If there is any uncertainty about data safety, do not proceed—ask first.
