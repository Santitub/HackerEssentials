import subprocess

# Ejecutar el comando 'wpat'
try:
    resultado = subprocess.run(['wpat'], check=True, text=True, capture_output=True)
    print("Salida del comando:")
    print(resultado.stdout)
except subprocess.CalledProcessError as e:
    print("Error al ejecutar wpat:")
    print(e.stderr)
