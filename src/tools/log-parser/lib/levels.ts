// Sample log creator for testing
export const createSampleLogs = (): string => {
  return `2024-01-15T08:23:45.123 [INFO] [com.example.UserService] User authentication successful - userId=12345
2024-01-15T08:23:46.456 [WARN] [com.example.SecurityFilter] Suspicious login attempt detected from IP 192.168.1.10
2024-01-15T08:24:01.789 [ERROR] [com.example.DatabaseService] Failed to connect to database - java.sql.SQLException: Connection refused
2024-01-15T08:24:05.234 [DEBUG] [com.example.ConfigLoader] Loading application properties from /etc/app/config.properties
2024-01-15T08:24:10.567 [INFO] [com.example.StartupManager] Application started in 3.45 seconds
2024-01-15T08:24:15.890 [SUCCESS] [com.example.HealthCheck] All system checks passed
2024-01-15T08:24:20.123 [WARN] [com.example.CacheService] Cache miss for key: user_preferences_12345
2024-01-15T08:24:25.456 [INFO] [com.example.ApiController] Processing request: GET /api/users/12345
2024-01-15T08:24:30.789 [ERROR] [com.example.ValidationService] Invalid email format: user@invalid - Expected valid email address
2024-01-15T08:24:35.012 [DEBUG] [com.example.TokenService] JWT token validation completed in 15ms`;
};
