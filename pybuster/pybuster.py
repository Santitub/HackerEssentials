import argparse
import requests
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from colorama import Fore, Style, init
import time

# Inicializar colorama
init(autoreset=True)

# Configuración del parser
parser = argparse.ArgumentParser(
    description=f"{Fore.CYAN}{Style.BRIGHT}Script de fuzzing de directorios web con hilos para cada extensión{Style.RESET_ALL}\n"
)

# Definir los argumentos
parser.add_argument(
    "-u", "--url", required=True,
    help=f"{Fore.GREEN}{Style.BRIGHT}-u URL, --url URL{Style.RESET_ALL}     URL del sitio web a probar"
)

parser.add_argument(
    "-w", "--wordlist", required=True,
    help=f"{Fore.YELLOW}{Style.BRIGHT}-w WORDLIST, --wordlist WORDLIST{Style.RESET_ALL} Archivo de palabras clave (wordlist) para el fuzzing"
)

parser.add_argument(
    "-e", "--extensions", required=True,
    help=f"{Fore.CYAN}{Style.BRIGHT}-e EXTENSIONS, --extensions EXTENSIONS{Style.RESET_ALL}     Extensiones a buscar (separadas por comas, ej. txt,js,html)"
)

parser.add_argument(
    "-m", "--max_workers", type=int, default=10,
    help=f"{Fore.MAGENTA}{Style.BRIGHT}-m MAX_WORKERS, --max_workers MAX_WORKERS{Style.RESET_ALL} Número máximo de hilos (por defecto 10)"
)

# Solicitar tipo de solicitud HTTP (GET o POST)
parser.add_argument(
    "-t", "--request_type", choices=["GET", "POST"], default="GET",
    help=f"{Fore.RED}{Style.BRIGHT}-t REQUEST_TYPE, --request_type REQUEST_TYPE{Style.RESET_ALL} Tipo de solicitud HTTP (GET o POST)"
)

# Agregar un argumento para personalizar los códigos de respuesta a mostrar
parser.add_argument(
    "-s", "--status_codes", 
    help=f"{Fore.BLUE}{Style.BRIGHT}-s STATUS_CODES, --status_codes STATUS_CODES{Style.RESET_ALL}     Códigos de estado HTTP a mostrar (separados por comas, ej. 200,403,301)"
)

# Sobrescribir el método print_help() para personalizar la salida
def custom_print_help(self, *args, **kwargs):
    header = f"{Fore.CYAN}{Style.BRIGHT}Usage:{Style.RESET_ALL}\n"
    flags_section = f"{Fore.YELLOW}{Style.BRIGHT}Flags:{Style.RESET_ALL}\n"
    
    # Imprimir la ayuda con un formato más limpio
    print(f"{header}{Fore.GREEN}{Style.BRIGHT}Available Options:{Style.RESET_ALL}\n")
    
    flags = [
        (f"{Style.BRIGHT}-u URL, --url URL", f"{Fore.GREEN}URL del sitio web a probar{Style.RESET_ALL}"),
        (f"{Style.BRIGHT}-w WORDLIST, --wordlist WORDLIST", f"{Fore.YELLOW}{Style.BRIGHT}Archivo de palabras clave (wordlist) para el fuzzing{Style.RESET_ALL}"),
        (f"{Style.BRIGHT}-e EXTENSIONS, --extensions EXTENSIONS", f"{Fore.CYAN}{Style.BRIGHT}Extensiones a buscar (separadas por comas, ej. txt,js,html){Style.RESET_ALL}"),
        (f"{Style.BRIGHT}-m MAX_WORKERS, --max_workers MAX_WORKERS", f"{Fore.MAGENTA}{Style.BRIGHT}Número máximo de hilos (por defecto 10){Style.RESET_ALL}"),
        (f"{Style.BRIGHT}-t REQUEST_TYPE, --request_type REQUEST_TYPE", f"{Fore.RED}{Style.BRIGHT}Tipo de solicitud HTTP (GET o POST){Style.RESET_ALL}"),
        (f"{Style.BRIGHT}-s STATUS_CODES, --status_codes STATUS_CODES", f"{Fore.BLUE}{Style.BRIGHT}Códigos de estado HTTP a mostrar (separados por comas, ej. 200,403,301){Style.RESET_ALL}")
    ]
    for flag, description in flags:
        print(f"  {flag}  {description}")

    print(f"\n{Fore.YELLOW}{Style.BRIGHT}Example usage:{Style.RESET_ALL}")
    print(f"  python pybuster.py -u http://example.com -w wordlist.txt -e txt,js -t GET -s 200,403")

# Reemplazar el método print_help() en el parser
argparse.ArgumentParser.print_help = custom_print_help

# Parseo de los argumentos
args = parser.parse_args()

# Leer la lista de palabras y cargarla en memoria
with open(args.wordlist, "r") as f:
    wordlist = f.read().splitlines()

# Obtener las extensiones si se proporcionaron
extensions = args.extensions.split(",") if args.extensions else []

# Obtener los códigos de estado a mostrar, si se proporcionaron
status_codes_to_show = set([int(code) for code in args.status_codes.split(",")]) if args.status_codes else {200}

# Función para hacer la solicitud HTTP
def fuzz_url(linea, ext=None, session=None):
    url_completa = args.url.rstrip('/') + '/' + linea
    if ext:
        url_completa = f"{url_completa}.{ext}"

    try:
        response = session.request(args.request_type, url_completa, timeout=10)  # Establecer un timeout
        if response.status_code in status_codes_to_show:
            tqdm.write(f"{Fore.GREEN}{Style.BRIGHT}URL encontrada con código {response.status_code}: {url_completa}")
    except requests.Timeout:
        tqdm.write(f"{Fore.RED}{Style.BRIGHT}[ERROR] Timeout en la solicitud: {url_completa}")
    except requests.ConnectionError:
        tqdm.write(f"{Fore.RED}{Style.BRIGHT}[ERROR] Error de conexión: {url_completa}")
    except requests.RequestException as e:
        tqdm.write(f"{Fore.RED}{Style.BRIGHT}[ERROR] Excepción HTTP desconocida: {url_completa} - {str(e)}")

# Realizar el fuzzing con las palabras y mostrar el progreso
def main():
    # Crear la sesión de requests fuera del ThreadPoolExecutor
    with requests.Session() as session:
        # Mostrar barra de progreso
        total_urls = len(wordlist) * len(extensions) if extensions else len(wordlist)
        progress = tqdm(total=total_urls, desc="Progreso", unit="urls", dynamic_ncols=True)

        # Crear un ejecutor de hilos
        with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
            futures = []
            for linea in wordlist:
                for ext in extensions:
                    # Enviar tarea para cada palabra + extensión
                    futures.append(executor.submit(fuzz_url, linea, ext, session))

            # Esperar y mostrar el progreso a medida que se completan las tareas
            for future in as_completed(futures):
                progress.update(1)

        progress.close()

# Ejecutar el fuzzing
try:
    main()
except KeyboardInterrupt:
    print(f"{Fore.YELLOW}{Style.BRIGHT}Saliendo...")
except Exception as e:
    print(f"{Fore.RED}{Style.BRIGHT}Error inesperado: {str(e)}")
