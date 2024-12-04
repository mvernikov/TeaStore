docker-compose -f examples/docker/docker-compose_default.yaml down
rm -rf k6-results/

docker-compose -f examples/docker/docker-compose_default.yaml up -d

echo "Waiting for services to initialize..."
sleep 15  # Увеличенное время ожидания


echo "Running k6 performance tests..."
k6 run \
    --out influxdb=http://localhost:8086/k6 \
    test.js

echo "Verifying InfluxDB connection..."
curl -G http://localhost:8086/query --data-urlencode "q=SHOW DATABASES"

python3 -m venv .venv
source .venv/bin/activate
pip install influxdb psycopg2-binary

echo "Transferring data from InfluxDB to PostgreSQL..."
python3 tools/influx_to_postgres.py

echo "Running database performance tests..."
PGPASSWORD=teastore_pass psql -h localhost -U teastore_user -d teastore_db -f queries/performance_tests.sql