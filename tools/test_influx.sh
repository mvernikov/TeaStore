# Подключитесь к контейнеру InfluxDB
docker exec -it docker-influxdb-1 bash

# Внутри контейнера запустите influx
influx

# Проверьте базы данных
SHOW DATABASES

# Выберите базу k6
USE k6

# Проверьте наличие данных
SHOW MEASUREMENTS
SELECT * FROM "k6"."autogen"./.*/ LIMIT 5