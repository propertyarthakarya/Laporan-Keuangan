warning: in the working copy of 'server/package.json', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/server/package.json b/server/package.json[m
[1mindex 4ca2d7d..f6203ab 100644[m
[1m--- a/server/package.json[m
[1m+++ b/server/package.json[m
[36m@@ -2,6 +2,11 @@[m
   "name": "financial-reporting-api",[m
   "version": "1.0.0",[m
   "private": true,[m
[32m+[m[32m  "allowScripts": {[m
[32m+[m[32m    "prisma": true,[m
[32m+[m[32m    "@prisma/client": true,[m
[32m+[m[32m    "@prisma/engines": true[m
[32m+[m[32m  },[m
   "scripts": {[m
     "dev": "ts-node-dev --respawn --transpile-only src/index.ts",[m
     "build": "prisma generate && tsc",[m
