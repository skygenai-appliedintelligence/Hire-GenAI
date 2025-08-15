@echo off
echo Pushing code to Hire-GenAI repository...
git add .
git commit -m "Update feature locking starter code"
git push origin dev:main --force
echo Code pushed successfully!
pause
