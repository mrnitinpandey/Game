import ssl
import http.server
from werkzeug.serving import make_ssl_devcert

# Automatically generate a self-signed dummy SSL certificate
print("Generating dev SSL certificate...")
make_ssl_devcert('ssl_dev', host='localhost')

# Configure the local HTTPS server on port 4443
server_address = ('localhost', 4443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Load the generated SSL certificate 
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile='ssl_dev.crt', keyfile='ssl_dev.key')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("\n" + "="*50)
print("SECURE HTTPS LOCALHOST RUNNING")
print("Open your browser to: https://localhost:4443/")
print("="*50 + "\n")

# Start server indefinitely
httpd.serve_forever()
