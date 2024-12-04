import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export const options = {
    scenarios: {
        database_performance: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 50 },   // Плавное увеличение
                { duration: '1m', target: 100 },   // Средняя нагрузка
                { duration: '30s', target: 200 },  // Пиковая нагрузка
                { duration: '30s', target: 0 },    // Плавное снижение
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<2000'], // 2 секунды
        'http_req_failed': ['rate<0.05'],     // 5% ошибок максимум
    },
};

// Функция для тестирования производительности БД
export default function () {
    // Тест SELECT запросов
    const selectTest = http.get(`${__ENV.API_URL}/api/metrics/last-hour`);
    check(selectTest, {
        'select response status is 200': (r) => r.status === 200,
        'select response time OK': (r) => r.timings.duration < 1000,
    });

    // Тест агрегации
    const aggregationTest = http.get(`${__ENV.API_URL}/api/metrics/aggregation`);
    check(aggregationTest, {
        'aggregation response status is 200': (r) => r.status === 200,
        'aggregation response time OK': (r) => r.timings.duration < 2000,
    });

    // Тест вставки данных
    const insertData = {
        metric_name: 'test_metric',
        value: Math.random() * 100,
        timestamp: new Date().toISOString()
    };

    const insertTest = http.post(
        `${__ENV.API_URL}/api/metrics`,
        JSON.stringify(insertData),
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(insertTest, {
        'insert response status is 200': (r) => r.status === 200,
        'insert response time OK': (r) => r.timings.duration < 500,
    });

    sleep(1); // Пауза между итерациями
}

// Расширенная обработка результатов
export function handleSummary(data) {
    const metrics = {
        'avg_response': data.metrics.http_req_duration.avg,
        'max_response': data.metrics.http_req_duration.max,
        'p95_response': data.metrics.http_req_duration.p(95),
        'error_rate': data.metrics.http_req_failed.rate,
        'total_requests': data.metrics.http_reqs.count,
    };

    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'summary.json': JSON.stringify({
            metrics: metrics,
            timestamp: new Date().toISOString(),
            test_duration: data.state.testRunDuration,
            total_vus: data.state.maxVUs,
        }, null, 2),
    };
}

// Функция мониторинга состояния БД
function checkDBHealth() {
    const healthCheck = http.get(`${__ENV.API_URL}/api/db/health`);
    return healthCheck.status === 200;
}

// Периодическая проверка состояния во время теста
setInterval(() => {
    if (!checkDBHealth()) {
        console.error('Database health check failed!');
    }
}, 5000);