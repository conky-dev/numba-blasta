redis-cli -u rediss://default:AXd6AAIncDIwYWMxYjc3MGI0ODY0YWRlOTk3NWU3NzVkZDg5OGMzY3AyMzA1ODY@mutual-falcon-30586.upstash.io:6379 << 'EOF'
DEL bull:sms:wait
DEL bull:sms:active
DEL bull:sms:delayed
DEL bull:campaigns:wait
DEL bull:campaigns:active
DEL bull:campaigns:delayed
ECHO "✅ Cleared all queued jobs (waiting, active, and delayed)"
EOF
