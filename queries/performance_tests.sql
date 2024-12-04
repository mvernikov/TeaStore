-- queries/performance_tests.sql
-- Проверка числа строк
select count(*) from k6_metrics;
-- Проверка времени выборки данных
EXPLAIN
ANALYZE
SELECT *
FROM k6_metrics
WHERE
    time > NOW() - INTERVAL '1 hour';

-- Проверка времени агрегации
EXPLAIN
ANALYZE
SELECT date_trunc('minute', time) as minute, AVG(value) as avg_value, COUNT(*) as count
FROM k6_metrics
GROUP BY
    minute
ORDER BY minute;

-- Проверка времени удаления
EXPLAIN
ANALYZE
DELETE FROM k6_metrics
WHERE
    time < NOW() - INTERVAL '1 day';

-- Проверка индексов
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE
    tablename = 'k6_metrics';