# Security Guidelines

This document outlines the security measures implemented in the Mushroom Revolution Tower Defense game.

## Docker Security

### Base Images

- **Updated Base Images**: Using `node:22-alpine3.20` instead of older versions to minimize vulnerabilities
- **Security Updates**: All Alpine packages are updated during build process
- **Non-Root User**: Containers run with non-root user `nodejs` (UID 1001)

### Build Security

- **Multi-stage Builds**: Frontend uses multi-stage builds to reduce attack surface
- **Minimal Dependencies**: Only production dependencies are included in final images
- **Cache Cleaning**: npm cache is cleaned after installation
- **File Permissions**: Proper ownership and permissions set for application files

### Runtime Security

- **Health Checks**: Both containers implement health checks for monitoring
- **Resource Limits**: Can be configured via Docker Compose
- **Network Isolation**: Services communicate through dedicated Docker network

## Application Security

### Backend Security

- **Helmet.js**: Security headers middleware enabled
- **CORS**: Properly configured CORS for frontend communication
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Can be implemented for API endpoints
- **Error Handling**: Sensitive information not exposed in error messages

### Data Security

- **Score Validation**: Server-side validation of game scores to prevent cheating
- **Session Management**: Secure session handling with automatic cleanup
- **Data Persistence**: JSON file storage with proper file permissions
- **Backup Functionality**: Secure data export/import capabilities

### Network Security

- **Environment Variables**: Sensitive configuration via environment variables
- **HTTPS Ready**: Application designed to work behind HTTPS proxy
- **WebSocket Security**: Socket.io with proper CORS configuration
- **Admin Endpoints**: Protected with authentication tokens

## Deployment Security

### Environment Configuration

```yaml
# Example secure environment variables
NODE_ENV=production
ADMIN_TOKEN=your-very-secure-random-token-here
LOG_LEVEL=warn
```

### Reverse Proxy (Recommended)

```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Monitoring

### Logging

- **Structured Logging**: Winston for consistent log format
- **Security Events**: Failed authentication, suspicious activity
- **Performance Monitoring**: Request timing and resource usage
- **Error Tracking**: Detailed error logs for debugging

### Health Checks

- **Application Health**: HTTP endpoints for service status
- **Database Health**: Data persistence verification
- **Resource Monitoring**: Memory and CPU usage tracking

## Best Practices

### For Developers

1. **Keep Dependencies Updated**: Regularly update npm packages
2. **Security Scanning**: Use `npm audit` to check for vulnerabilities
3. **Code Review**: Review all code changes for security issues
4. **Environment Separation**: Different configs for dev/staging/production

### For Administrators

1. **Regular Updates**: Keep Docker images and host OS updated
2. **Backup Strategy**: Regular backups of game data and configurations
3. **Access Control**: Limit access to production systems
4. **Monitoring**: Set up alerts for security and performance issues

### For Users

1. **Secure Hosting**: Use HTTPS in production
2. **Firewall Rules**: Limit network access to necessary ports only
3. **User Data**: Be transparent about data collection and storage
4. **Privacy**: Implement privacy controls for user information

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **Do not** create a public GitHub issue
2. Email the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Security Updates

This project follows semantic versioning for security updates:

- **Patch versions** (x.x.X): Security fixes, safe to update immediately
- **Minor versions** (x.X.x): Security improvements, review changes
- **Major versions** (X.x.x): Breaking changes, test thoroughly

## Compliance

This application is designed to be compliant with:

- **OWASP Top 10**: Web application security risks
- **Docker Security Best Practices**: Container security guidelines
- **Node.js Security Guidelines**: Runtime security recommendations
