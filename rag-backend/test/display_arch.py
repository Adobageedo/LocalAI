import os
import shutil

def display_project_architecture(startpath, ignored_names=None):
    """
    Affiche l'architecture d'un projet de manière arborescente, en ignorant certains fichiers/dossiers.

    Args:
        startpath (str): Le chemin du répertoire racine du projet.
        ignored_names (list, optional): Une liste de noms de fichiers ou de répertoires à ignorer.
                                        Par défaut, ['__pycache__', '.git', '.DS_Store', '.env', '.vscode', '.idea', '*.pyc', '*.log'].
    """
    if ignored_names is None:
        # Noms à ignorer par défaut. Vous pouvez ajouter ou retirer des éléments ici.
        ignored_names = ['.git', '__pycache__', '.DS_Store', '.env', '.vscode', '.idea', '.pytest_cache', '*.pyc', '*.log']

    print(f"{startpath}/")
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * level
        
        # Filtrer les répertoires à ignorer de la liste 'dirs' pour ne pas les parcourir.
        # Notez que nous traitons les noms de répertoires entiers ici.
        dirs[:] = [d for d in dirs if d not in ignored_names]

        # Si le répertoire actuel est l'un des répertoires ignorés (par exemple, si on a démarré la marche depuis l'intérieur),
        # ou s'il a été filtré, alors nous ne voulons pas l'afficher ni ses contenus.
        # Cette vérification est cruciale pour le cas où root lui-même pourrait être un répertoire ignoré.
        current_dir_name = os.path.basename(root)
        if level > 0 and current_dir_name in ignored_names:
            continue # Passe au prochain élément de os.walk si le répertoire est ignoré

        # Afficher le répertoire actuel s'il n'est pas le répertoire racine lui-même
        if level > 0:
            print(f"{indent}├── {current_dir_name}/")
        
        # Filtrer les fichiers ignorés.
        # Cela gère les noms de fichiers exacts et les motifs de type glob (comme '*.pyc').
        filtered_files = []
        for f in files:
            if f in ignored_names:
                continue
            # Gérer les motifs de type glob (ex: '*.pyc')
            if any(f.endswith(suffix.lstrip('*')) for suffix in ignored_names if suffix.startswith('*.')):
                continue
            filtered_files.append(f)

        for f in filtered_files:
            print(f"{indent}│   ├── {f}")


def create_dummy_project_structure(root_dir):
    """Crée une structure de projet factice pour le test."""
    os.makedirs(os.path.join(root_dir, 'k8s', 'base'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'k8s', 'helm', 'templates'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'k8s', 'secrets'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'app', 'api'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'app', 'services'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'app', 'models'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'app', 'utils'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'worker', 'tasks'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'auth'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'backend', 'config'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'docker', 'nginx'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'docker', 'qdrant'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'docs'), exist_ok=True)

    # Création de fichiers factices
    with open(os.path.join(root_dir, 'k8s', 'base', 'api-deployment.yaml'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'k8s', 'base', 'api-service.yaml'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'k8s', 'helm', 'values.yaml'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'backend', 'app', 'main.py'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'backend', 'app', 'api', 'upload.py'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'backend', 'worker', 'main.py'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'docs', 'README.md'), 'w') as f: f.write('')
    with open(os.path.join(root_dir, 'docker', 'docker-compose.yml'), 'w') as f: f.write('')


if __name__ == "__main__":
    project_root = "/Users/edoardo/Documents/LocalAI/rag-backend"
    
    print("\nArchitecture de votre projet:")
    display_project_architecture(project_root)