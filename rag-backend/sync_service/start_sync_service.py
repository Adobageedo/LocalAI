#!/usr/bin/env python3
"""
Script de démarrage du service de synchronisation d'emails
=========================================================
Permet de démarrer facilement le service de synchronisation en mode daemon
ou en mode interactif, avec des options de configuration.
"""
import os
import sys
import argparse
import subprocess
from pathlib import Path

# Ajouter le répertoire parent au path pour permettre les imports
script_dir = Path(__file__).parent
sys.path.append(str(script_dir.parent))

from sync_service.utils.logger import setup_logger

# Configuration du logger
logger = setup_logger('sync_service.starter')

def parse_arguments():
    """Parse les arguments de ligne de commande."""
    parser = argparse.ArgumentParser(description='Service de synchronisation des emails pour LocalAI')
    
    parser.add_argument('--daemon', '-d', action='store_true',
                        help='Démarrer en mode daemon (arrière-plan)')
    
    parser.add_argument('--interval', '-i', type=int, default=5,
                        help='Intervalle de synchronisation en minutes (défaut: 5)')
    
    parser.add_argument('--config', '-c', type=str, 
                        default=str(script_dir / 'config' / 'sync_config.yaml'),
                        help='Chemin vers le fichier de configuration')
    
    parser.add_argument('--run-once', '-o', action='store_true',
                        help='Exécuter une seule synchronisation puis quitter')
    
    parser.add_argument('--debug', action='store_true',
                        help='Activer les logs de débogage')
    
    return parser.parse_args()

def start_daemon(args):
    """Démarre le service en mode daemon."""
    # Construire la commande pour le service principal
    cmd = [
        sys.executable, 
        str(script_dir / 'main.py'),
        '--interval', str(args.interval),
        '--config', args.config
    ]
    
    if args.debug:
        cmd.append('--debug')
    
    if args.run_once:
        cmd.append('--run-once')
    
    # Créer le fichier de log
    log_file = script_dir.parent / 'logs' / 'sync_service.log'
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Ouvrir les fichiers de redirection
    with open(log_file, 'a') as log_out:
        # Démarrer le processus en arrière-plan
        process = subprocess.Popen(
            cmd,
            stdout=log_out,
            stderr=log_out,
            close_fds=True,
            start_new_session=True
        )
    
    # Enregistrer le PID pour pouvoir arrêter le service ultérieurement
    pid_file = script_dir.parent / 'logs' / 'sync_service.pid'
    with open(pid_file, 'w') as f:
        f.write(str(process.pid))
    
    print(f"Service de synchronisation démarré en arrière-plan (PID: {process.pid})")
    print(f"Logs disponibles dans: {log_file}")
    print(f"Pour arrêter le service: kill {process.pid}")

def start_interactive(args):
    """Démarre le service en mode interactif."""
    # Importer et exécuter directement le script principal
    from sync_service.main import main
    
    # Définir les arguments d'environnement pour main
    sys.argv = [
        sys.argv[0],
        '--interval', str(args.interval),
        '--config', args.config
    ]
    
    if args.debug:
        sys.argv.append('--debug')
    
    if args.run_once:
        sys.argv.append('--run-once')
    
    # Exécuter main
    main()

def main():
    """Point d'entrée principal."""
    args = parse_arguments()
    
    # Vérifier si le fichier de configuration existe
    if not os.path.exists(args.config):
        print(f"ATTENTION: Le fichier de configuration {args.config} n'existe pas.")
        
        # Créer le répertoire de configuration s'il n'existe pas
        config_dir = Path(args.config).parent
        if not config_dir.exists():
            config_dir.mkdir(parents=True, exist_ok=True)
            print(f"Le répertoire {config_dir} a été créé.")
        
        print("Utilisation de la configuration par défaut.")
    
    if args.daemon:
        start_daemon(args)
    else:
        start_interactive(args)

if __name__ == "__main__":
    main()
