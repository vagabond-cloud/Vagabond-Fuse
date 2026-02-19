# Production-Ready Credential Hub Proof Service

## Overview

This is a production-grade implementation of the Credential Hub Proof Service for the FuseStream platform. The service provides secure, scalable, and high-performance zero-knowledge proof generation and verification capabilities for verifiable credentials.

## 🚀 Key Features

### Production Enhancements

- **Database Integration**: PostgreSQL with connection pooling and migrations
- **Caching Layer**: Redis for high-performance caching and rate limiting
- **Security**: Rate limiting, input validation, circuit integrity checks, and replay attack prevention
- **Monitoring**: Prometheus metrics, health checks, and performance tracking
- **Scalability**: Async/await throughout, connection pooling, and horizontal scaling support
- **Error Handling**: Comprehensive error handling with proper logging
- **Testing**: Extensive test suite with unit, integration, and security tests

### Core Capabilities

- **Zero-Knowledge Proof Generation**: Support for Groth16 proofs using SnarkJS
- **Proof Verification**: Cryptographic verification with multiple validation checks
- **Circuit Management**: Dynamic circuit registration and integrity verification
- **Selective Disclosure**: Fine-grained attribute revelation control
- **Multi-Circuit Support**: Support for different proof types and security levels

## 📋 Requirements

### System Requirements

- **Python**: 3.11+
- **Node.js**: 16+ (for SnarkJS)
- **PostgreSQL**: 14+
- **Redis**: 6+
- **Memory**: 4GB+ recommended
- **Storage**: 10GB+ for circuits and proofs

### Dependencies

See `pyproject.toml` for complete dependency list. Key packages:

- **FastAPI**: Web framework
- **asyncpg**: PostgreSQL async driver
- **aioredis**: Redis async client
- **prometheus-client**: Metrics collection
- **cryptography**: Security operations
- **pydantic**: Data validation

## 🔧 Installation

### 1. Clone and Setup

```bash
cd services/credential-hub
```

### 2. Install Dependencies

```bash
# Install Poetry (if not already installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install Python dependencies
poetry install

# Install Node.js dependencies for SnarkJS
npm install
```

### 3. Database Setup

**PostgreSQL:**

```bash
# Create database
createdb credential_hub

# The service will automatically run migrations on startup
```

**Redis:**

```bash
# Start Redis server
redis-server
```

### 4. Environment Configuration

Create a `.env` file with your configuration:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/credential_hub
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
RATE_LIMIT_PER_MINUTE=60

# Performance
PROOF_CACHE_TTL=3600
MAX_CONCURRENT_PROOFS=10

# Monitoring
METRICS_ENABLED=true
LOG_LEVEL=INFO
```

## 🚀 Deployment

### Development

```bash
# Start with auto-reload
poetry run uvicorn app.main:app --reload --port 8000
```

### Production

```bash
# Use the deployment script
./deploy.sh

# Or manually with Gunicorn/Uvicorn
poetry run uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --access-log
```

### Docker (Recommended for Production)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --only=main

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔍 API Endpoints

### Core Proof Operations

- **POST /proofs/generate** - Generate a zero-knowledge proof
- **POST /proofs/verify** - Verify a proof
- **GET /proofs/{proof_id}** - Retrieve a proof by ID

### Management & Monitoring

- **GET /health** - Health check endpoint
- **GET /metrics/proofs** - Proof service metrics
- **GET /circuits** - List available circuits
- **GET /stats** - Service statistics

### Example: Generate Proof

```bash
curl -X POST http://localhost:8000/proofs/generate \
  -H "Content-Type: application/json" \
  -d '{
    "credential_id": "550e8400-e29b-41d4-a716-446655440000",
    "reveal_attributes": ["name", "age"],
    "circuit_id": "selective-disclosure"
  }'
```

### Example: Verify Proof

```bash
curl -X POST http://localhost:8000/proofs/verify \
  -H "Content-Type: application/json" \
  -d '{
    "proof_id": "proof-id-here"
  }'
```

## 🔒 Security Features

### Rate Limiting

- Redis-based sliding window rate limiting
- Configurable limits per user/IP
- Burst protection

### Input Validation

- Comprehensive input sanitization
- Circuit parameter validation
- Field element bounds checking

### Circuit Integrity

- SHA256 hash verification of circuit files
- Trusted setup validation
- File access permissions

### Replay Attack Prevention

- Cryptographic nonces for each proof
- Redis-based nonce tracking
- Configurable nonce expiration

## 📊 Monitoring & Metrics

### Prometheus Metrics

The service exposes metrics on `/metrics`:

- `proof_generation_total` - Total proof generations
- `proof_verification_total` - Total proof verifications
- `proof_generation_duration_seconds` - Generation time histogram
- `proof_verification_duration_seconds` - Verification time histogram
- `circuit_integrity_checks_total` - Circuit integrity checks
- `rate_limit_hits_total` - Rate limit violations

### Health Checks

Health check endpoint provides:

- Database connectivity
- Redis connectivity
- Circuit availability
- System resource usage
- Overall service status

### Logging

Structured JSON logging with configurable levels:

- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events

## 🧪 Testing

### Run Tests

```bash
# Unit tests
poetry run pytest tests/

# With coverage
poetry run pytest tests/ --cov=app

# Integration tests
poetry run pytest tests/ -m integration

# Performance tests
poetry run pytest tests/ -m performance
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflows
- **Security Tests**: Attack scenario validation
- **Performance Tests**: Load and stress testing

## 🔧 Configuration

### Environment Variables

| Variable                | Description                      | Default                                      |
| ----------------------- | -------------------------------- | -------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string     | `postgresql://localhost:5432/credential_hub` |
| `REDIS_URL`             | Redis connection string          | `redis://localhost:6379`                     |
| `SECRET_KEY`            | JWT signing key                  | **Must be set in production**                |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per user              | `60`                                         |
| `PROOF_CACHE_TTL`       | Proof cache expiration (seconds) | `3600`                                       |
| `LOG_LEVEL`             | Logging level                    | `INFO`                                       |
| `METRICS_ENABLED`       | Enable Prometheus metrics        | `true`                                       |

### Circuit Configuration

Circuits are configured in the `circuits/` directory:

```json
{
  "id": "selective-disclosure",
  "description": "Selective disclosure circuit",
  "wasm_file": "circuit.wasm",
  "zkey_file": "circuit_final.zkey",
  "vkey_file": "verification_key.json",
  "max_attributes": 20,
  "security_level": 128
}
```

## 🚨 Production Considerations

### Database

- **Connection Pooling**: Configure appropriate pool sizes
- **Backups**: Regular automated backups
- **Monitoring**: Database performance metrics
- **Scaling**: Read replicas for high-load scenarios

### Redis

- **Persistence**: Configure appropriate persistence model
- **Memory Management**: Monitor memory usage
- **Clustering**: Redis Cluster for high availability

### Security

- **Secrets Management**: Use proper secret management (HashiCorp Vault, etc.)
- **Network Security**: VPN/private networks for database access
- **SSL/TLS**: HTTPS termination at load balancer
- **Audit Logging**: Comprehensive audit trails

### Performance

- **Load Balancing**: Multiple service instances behind load balancer
- **Caching**: Redis for proof and circuit caching
- **Resource Limits**: Container resource limits
- **Circuit Optimization**: Optimized circuit files

### Monitoring

- **Alerting**: Set up alerts for key metrics
- **Dashboards**: Grafana dashboards for visualization
- **Log Aggregation**: Centralized logging (ELK stack)
- **APM**: Application performance monitoring

## 🔄 Circuit Management

### Adding New Circuits

1. **Prepare Circuit Files**:

   ```bash
   mkdir circuits/my-new-circuit
   # Add circuit.wasm, circuit_final.zkey, verification_key.json
   ```

2. **Create Configuration**:

   ```json
   {
     "id": "my-new-circuit",
     "description": "My new circuit",
     "max_attributes": 15,
     "security_level": 128
   }
   ```

3. **Register Circuit**:
   ```bash
   curl -X POST http://localhost:8000/circuits \
     -H "Content-Type: application/json" \
     -d @circuit-config.json
   ```

### Circuit Security

- Always verify circuit trusted setup
- Validate circuit parameters before use
- Monitor circuit performance metrics
- Regular integrity checks

## 🛠️ Troubleshooting

### Common Issues

**Database Connection Errors**:

```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql -h localhost -U username -d credential_hub -c "SELECT 1;"
```

**Redis Connection Errors**:

```bash
# Check Redis status
systemctl status redis

# Test connection
redis-cli ping
```

**SnarkJS Errors**:

```bash
# Check Node.js version
node --version

# Verify SnarkJS installation
npm list snarkjs
```

**Circuit File Issues**:

```bash
# Check file permissions
ls -la circuits/

# Verify file integrity
sha256sum circuits/*/circuit.wasm
```

### Performance Issues

- Monitor database connection pool usage
- Check Redis memory usage
- Verify circuit file sizes
- Review proof generation timeouts

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=DEBUG
```

## 📈 Scaling

### Horizontal Scaling

- Deploy multiple service instances
- Use load balancer (nginx, HAProxy)
- Share Redis instance across instances
- Database connection pooling

### Vertical Scaling

- Increase memory for larger circuits
- More CPU cores for parallel processing
- SSD storage for faster I/O

### Database Scaling

- Read replicas for proof verification
- Partitioning for large proof tables
- Connection pooling optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For issues and questions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error details
- Monitor health check endpoint

---

**⚠️ Security Notice**: This service handles cryptographic operations and sensitive credential data. Always follow security best practices in production deployments.
