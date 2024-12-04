import logging
from influxdb import InfluxDBClient
import psycopg2
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def main():
    try:
        # InfluxDB connection
        influx_client = InfluxDBClient(host='localhost', port=8086, database='k6')
        
        # PostgreSQL connection
        pg_conn = psycopg2.connect(
            host="localhost",
            database="teastore_db",
            user="teastore_user",
            password="teastore_pass"
        )
        cursor = pg_conn.cursor()

        # Удаляем старую таблицу и создаем новую
        cursor.execute("""
            DROP TABLE IF EXISTS k6_metrics;
            
            CREATE TABLE k6_metrics (
                time TIMESTAMP,
                check_name VARCHAR(255),
                error_code VARCHAR(50),
                expected_response BOOLEAN,
                method VARCHAR(10),
                name VARCHAR(255),
                proto VARCHAR(10),
                scenario VARCHAR(50),
                status INTEGER,
                url TEXT,
                value NUMERIC
            );
        """)

        # Получение данных из InfluxDB
        query = 'SELECT * FROM "k6"."autogen"./.*/'
        logger.info(f"Executing InfluxDB query: {query}")
        results = influx_client.query(query)
        
        # Вставка данных
        for point in results.get_points():
            logger.debug(f"Processing point: {point}")
            cursor.execute("""
                INSERT INTO k6_metrics (
                    time,
                    check_name,
                    error_code,
                    expected_response,
                    method,
                    name,
                    proto,
                    scenario,
                    status,
                    url,
                    value
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                datetime.strptime(point['time'], '%Y-%m-%dT%H:%M:%S.%fZ'),
                point.get('check'),
                point.get('error_code'),
                point.get('expected_response'),
                point.get('method'),
                point.get('name'),
                point.get('proto'),
                point.get('scenario'),
                point.get('status'),
                point.get('url'),
                point.get('value')
            ))
        
        pg_conn.commit()
        logger.info("Data transfer completed successfully")

        # Проверка данных
        cursor.execute("SELECT COUNT(*) FROM k6_metrics")
        count = cursor.fetchone()[0]
        logger.info(f"Total records transferred: {count}")

    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        raise
    finally:
        if 'pg_conn' in locals():
            pg_conn.close()

if __name__ == "__main__":
    main()