import time
import psutil
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from prometheus_client import Counter, Histogram, Gauge, start_http_server
from contextlib import asynccontextmanager
import asyncio

from app.config import get_settings

logger = logging.getLogger(__name__)


# Prometheus metrics
proof_generation_counter = Counter(
    'proof_generation_total', 
    'Total number of proof generation attempts',
    ['circuit_id', 'status']
)

proof_verification_counter = Counter(
    'proof_verification_total',
    'Total number of proof verification attempts', 
    ['circuit_id', 'status']
)

proof_generation_duration = Histogram(
    'proof_generation_duration_seconds',
    'Time spent generating proofs',
    ['circuit_id'],
    buckets=[1, 5, 10, 30, 60, 120, 300]
)

proof_verification_duration = Histogram(
    'proof_verification_duration_seconds',
    'Time spent verifying proofs',
    ['circuit_id'],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30]
)

circuit_integrity_checks = Counter(
    'circuit_integrity_checks_total',
    'Total circuit integrity checks',
    ['circuit_id', 'status']
)

rate_limit_hits = Counter(
    'rate_limit_hits_total',
    'Total rate limit hits',
    ['identifier_type']
)

database_query_duration = Histogram(
    'database_query_duration_seconds',
    'Database query execution time',
    ['operation', 'table'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 2, 5]
)

cache_operations = Counter(
    'cache_operations_total',
    'Cache operations',
    ['operation', 'status']
)

# System metrics
system_memory_usage = Gauge('system_memory_usage_bytes', 'System memory usage')
system_cpu_usage = Gauge('system_cpu_usage_percent', 'System CPU usage percentage')
active_connections = Gauge('active_database_connections', 'Active database connections', ['type'])


class ProofMetrics:
    """Centralized metrics collection for proof operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self._circuit_stats: Dict[str, Dict[str, Any]] = {}
        self._performance_buffer: Dict[str, Any] = {
            'generation_times': [],
            'verification_times': [],
            'error_counts': {},
            'success_rates': {}
        }

    @asynccontextmanager
    async def track_proof_generation(self, circuit_id: str):
        """Context manager to track proof generation metrics"""
        start_time = time.time()
        status = 'success'
        
        try:
            yield
        except Exception as e:
            status = 'error'
            logger.error(f"Proof generation failed for circuit {circuit_id}: {e}")
            raise
        finally:
            duration = time.time() - start_time
            
            # Update Prometheus metrics
            proof_generation_counter.labels(circuit_id=circuit_id, status=status).inc()
            proof_generation_duration.labels(circuit_id=circuit_id).observe(duration)
            
            # Update internal stats
            self._update_circuit_stats(circuit_id, 'generation', duration, status == 'success')

    @asynccontextmanager  
    async def track_proof_verification(self, circuit_id: str):
        """Context manager to track proof verification metrics"""
        start_time = time.time()
        status = 'success'
        
        try:
            yield
        except Exception as e:
            status = 'error'
            logger.error(f"Proof verification failed for circuit {circuit_id}: {e}")
            raise
        finally:
            duration = time.time() - start_time
            
            # Update Prometheus metrics
            proof_verification_counter.labels(circuit_id=circuit_id, status=status).inc()
            proof_verification_duration.labels(circuit_id=circuit_id).observe(duration)
            
            # Update internal stats
            self._update_circuit_stats(circuit_id, 'verification', duration, status == 'success')

    @asynccontextmanager
    async def track_database_query(self, operation: str, table: str):
        """Context manager to track database query performance"""
        start_time = time.time()
        
        try:
            yield
        finally:
            duration = time.time() - start_time
            database_query_duration.labels(operation=operation, table=table).observe(duration)

    def record_circuit_integrity_check(self, circuit_id: str, success: bool):
        """Record circuit integrity check result"""
        status = 'success' if success else 'failure'
        circuit_integrity_checks.labels(circuit_id=circuit_id, status=status).inc()

    def record_rate_limit_hit(self, identifier_type: str):
        """Record rate limit hit"""
        rate_limit_hits.labels(identifier_type=identifier_type).inc()

    def record_cache_operation(self, operation: str, success: bool):
        """Record cache operation"""
        status = 'success' if success else 'failure'
        cache_operations.labels(operation=operation, status=status).inc()

    def _update_circuit_stats(self, circuit_id: str, operation: str, duration: float, success: bool):
        """Update internal circuit statistics"""
        if circuit_id not in self._circuit_stats:
            self._circuit_stats[circuit_id] = {
                'generation': {'count': 0, 'success_count': 0, 'total_time': 0, 'avg_time': 0},
                'verification': {'count': 0, 'success_count': 0, 'total_time': 0, 'avg_time': 0}
            }
        
        stats = self._circuit_stats[circuit_id][operation]
        stats['count'] += 1
        stats['total_time'] += duration
        stats['avg_time'] = stats['total_time'] / stats['count']
        
        if success:
            stats['success_count'] += 1

    def get_circuit_statistics(self) -> Dict[str, Any]:
        """Get circuit performance statistics"""
        return self._circuit_stats.copy()

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        total_generations = sum(
            stats['generation']['count'] 
            for stats in self._circuit_stats.values()
        )
        
        total_verifications = sum(
            stats['verification']['count'] 
            for stats in self._circuit_stats.values()
        )
        
        successful_generations = sum(
            stats['generation']['success_count'] 
            for stats in self._circuit_stats.values()
        )
        
        successful_verifications = sum(
            stats['verification']['success_count'] 
            for stats in self._circuit_stats.values()
        )
        
        return {
            'total_operations': total_generations + total_verifications,
            'generation_success_rate': successful_generations / max(total_generations, 1),
            'verification_success_rate': successful_verifications / max(total_verifications, 1),
            'avg_generation_time': sum(
                stats['generation']['avg_time'] 
                for stats in self._circuit_stats.values()
            ) / max(len(self._circuit_stats), 1),
            'avg_verification_time': sum(
                stats['verification']['avg_time'] 
                for stats in self._circuit_stats.values()
            ) / max(len(self._circuit_stats), 1)
        }


class SystemMonitor:
    """System resource monitoring"""
    
    def __init__(self, update_interval: int = 10):
        self.update_interval = update_interval
        self._monitoring_task: Optional[asyncio.Task] = None
        self._is_running = False

    async def start(self):
        """Start system monitoring"""
        if self._is_running:
            return
            
        self._is_running = True
        self._monitoring_task = asyncio.create_task(self._monitor_loop())
        logger.info("System monitoring started")

    async def stop(self):
        """Stop system monitoring"""
        self._is_running = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("System monitoring stopped")

    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self._is_running:
            try:
                # Update system metrics
                memory = psutil.virtual_memory()
                system_memory_usage.set(memory.used)
                
                cpu_percent = psutil.cpu_percent(interval=1)
                system_cpu_usage.set(cpu_percent)
                
                # Log warnings for high resource usage
                if memory.percent > 90:
                    logger.warning(f"High memory usage: {memory.percent:.1f}%")
                
                if cpu_percent > 90:
                    logger.warning(f"High CPU usage: {cpu_percent:.1f}%")
                
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Error in system monitoring: {e}")
                await asyncio.sleep(self.update_interval)


class HealthChecker:
    """Health check functionality"""
    
    def __init__(self, db_manager, proof_service):
        self.db_manager = db_manager
        self.proof_service = proof_service
        self._last_health_check = datetime.now()
        self._health_status = {'status': 'unknown', 'checks': {}}

    async def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        checks = {}
        overall_status = 'healthy'
        
        # Database health
        try:
            async with self.db_manager.get_postgres_connection() as conn:
                await conn.execute("SELECT 1")
            checks['database'] = {'status': 'healthy', 'message': 'Database connection OK'}
        except Exception as e:
            checks['database'] = {'status': 'unhealthy', 'message': f'Database error: {e}'}
            overall_status = 'unhealthy'

        # Redis health
        try:
            await self.db_manager.redis.ping()
            checks['redis'] = {'status': 'healthy', 'message': 'Redis connection OK'}
        except Exception as e:
            checks['redis'] = {'status': 'unhealthy', 'message': f'Redis error: {e}'}
            overall_status = 'unhealthy'

        # Circuit availability
        try:
            circuits = await self.proof_service.list_circuits()
            if circuits:
                checks['circuits'] = {
                    'status': 'healthy', 
                    'message': f'{len(circuits)} circuits available'
                }
            else:
                checks['circuits'] = {
                    'status': 'warning', 
                    'message': 'No circuits available'
                }
                if overall_status == 'healthy':
                    overall_status = 'degraded'
        except Exception as e:
            checks['circuits'] = {'status': 'unhealthy', 'message': f'Circuit check error: {e}'}
            overall_status = 'unhealthy'

        # System resources
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent()
        
        if memory.percent > 95 or cpu_percent > 95:
            checks['resources'] = {
                'status': 'critical',
                'message': f'High resource usage: CPU {cpu_percent:.1f}%, Memory {memory.percent:.1f}%'
            }
            overall_status = 'unhealthy'
        elif memory.percent > 80 or cpu_percent > 80:
            checks['resources'] = {
                'status': 'warning',
                'message': f'Elevated resource usage: CPU {cpu_percent:.1f}%, Memory {memory.percent:.1f}%'
            }
            if overall_status == 'healthy':
                overall_status = 'degraded'
        else:
            checks['resources'] = {
                'status': 'healthy',
                'message': f'Resource usage normal: CPU {cpu_percent:.1f}%, Memory {memory.percent:.1f}%'
            }

        self._health_status = {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'checks': checks
        }
        
        self._last_health_check = datetime.now()
        return self._health_status

    def get_last_health_status(self) -> Dict[str, Any]:
        """Get the last health check result"""
        return self._health_status


class MetricsServer:
    """Prometheus metrics server"""
    
    def __init__(self, port: int = 9090):
        self.port = port
        self._server_started = False

    def start(self):
        """Start Prometheus metrics server"""
        if not self._server_started:
            start_http_server(self.port)
            self._server_started = True
            logger.info(f"Metrics server started on port {self.port}")


# Global instances
proof_metrics = ProofMetrics()
system_monitor = SystemMonitor()
metrics_server = MetricsServer()


def init_monitoring(db_manager=None, proof_service=None):
    """Initialize monitoring components"""
    settings = get_settings()
    
    if settings.metrics_enabled:
        metrics_server.start()
    
    # Start system monitoring
    asyncio.create_task(system_monitor.start())
    
    # Create health checker if dependencies provided
    health_checker = None
    if db_manager and proof_service:
        health_checker = HealthChecker(db_manager, proof_service)
    
    return proof_metrics, system_monitor, health_checker


async def cleanup_monitoring():
    """Cleanup monitoring resources"""
    await system_monitor.stop()


def get_proof_metrics() -> ProofMetrics:
    """Get proof metrics instance"""
    return proof_metrics 