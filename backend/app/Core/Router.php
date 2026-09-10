<?php
namespace App\Core;

use App\Helpers\Response;

class Router {
    private array $routes = [];
    private array $middlewares = [];

    public function add(string $method, string $path, $handler, array $middlewares = []): void {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $this->convertPathToRegex($path),
            'handler' => $handler,
            'middlewares' => $middlewares,
            'originalPath' => $path
        ];
    }

    public function get(string $path, $handler, array $middlewares = []): void {
        $this->add('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, $handler, array $middlewares = []): void {
        $this->add('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, $handler, array $middlewares = []): void {
        $this->add('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, $handler, array $middlewares = []): void {
        $this->add('DELETE', $path, $handler, $middlewares);
    }

    public function options(string $path, $handler): void {
        $this->add('OPTIONS', $path, $handler);
    }

    public function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // Handle CORS preflight
        if ($method === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        // Normalize URI: strip trailing slash and base path if any
        $uri = rtrim($uri, '/');
        if ($uri === '') {
            $uri = '/';
        }

        // Match route
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['pattern'], $uri, $matches)) {
                array_shift($matches); // Remove full match
                $matches = array_map('urldecode', $matches);

                // Execute middlewares
                foreach ($route['middlewares'] as $middleware) {
                    if (is_callable($middleware)) {
                        $result = $middleware();
                    } elseif (class_exists($middleware)) {
                        $instance = new $middleware();
                        $result = $instance->handle();
                    } else {
                        $result = true;
                    }

                    if ($result === false) {
                        return; // middleware aborted response
                    }
                }

                // Execute handler
                if (is_callable($route['handler'])) {
                    call_user_func_array($route['handler'], $matches);
                    return;
                }

                if (is_array($route['handler']) && count($route['handler']) === 2) {
                    [$class, $action] = $route['handler'];
                    if (class_exists($class)) {
                        $controller = new $class();
                        if (method_exists($controller, $action)) {
                            call_user_func_array([$controller, $action], $matches);
                            return;
                        }
                    }
                }

                Response::json(['error' => 'Handler method not found'], 500);
                return;
            }
        }

        Response::json([
            'success' => false,
            'error'   => 'Endpoint Not Found',
            'method'  => $method,
            'uri'     => $uri
        ], 404);
    }

    private function convertPathToRegex(string $path): string {
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $path);
        return '#^' . $pattern . '$#';
    }
}
