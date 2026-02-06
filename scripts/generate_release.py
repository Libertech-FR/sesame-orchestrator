#!/usr/bin/env python3
"""Génère un fichier de notes de release local à partir du template .cursor/release.mdc

Usage examples:
  PREV=v1.2.3 TARGET=v1.3.0 python3 scripts/generate_release.py
  python3 scripts/generate_release.py --target v1.3.0
  python3 scripts/generate_release.py --target v1.3.0 --output .cursor/release_notes.md

Le script récupère la version précédente (tag Git) automatiquement si --prev n'est pas fourni.
Il n'utilise pas l'API GitHub.
"""
from __future__ import annotations
import argparse
import subprocess
import sys
from pathlib import Path


TEMPLATE_PATH = Path('.cursor/release.mdc')


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def list_tags() -> list[str]:
    # liste les tags triés par date de création (ancien -> récent)
    out = run(["git", "for-each-ref", "--sort=creatordate", "--format=%(refname:strip=2)", "refs/tags"]) 
    return [t for t in out.splitlines() if t]


def find_previous_tag(target: str) -> str | None:
    tags = list_tags()
    if target in tags:
        idx = tags.index(target)
        return tags[idx-1] if idx > 0 else None
    return None


def build_changelog(prev: str, target: str) -> str:
    try:
        out = run(["git", "log", "--pretty=format:- %s (%h)", f"{prev}..{target}"])
        return out or "(aucun commit trouvé entre les versions)"
    except subprocess.CalledProcessError:
        return "(erreur lors de la récupération du changelog)"


def main() -> int:
    p = argparse.ArgumentParser(description="Génère un fichier de notes de release local depuis .cursor/release.mdc")
    p.add_argument('--target', '-t', required=False, help='Tag ou commit cible (ex: v1.3.0)')
    p.add_argument('--prev', '-p', required=False, help='Tag ou commit précédent (optionnel)')
    p.add_argument('--output', '-o', default='.cursor/release_notes.md', help='Chemin de sortie du fichier généré')
    p.add_argument('--repo', '-r', required=False, help="Forcer le repo GitHub sous la forme 'owner/repo' ou une URL https://github.com/owner/repo")
    args = p.parse_args()

    target = args.target or None
    prev = args.prev or None

    # Si les variables d'environnement PREV/TARGET sont fournies, les utiliser
    import os
    target = target or os.environ.get('TARGET')
    prev = prev or os.environ.get('PREV')

    if not target:
        print('Erreur: vous devez fournir --target ou la variable d\'environnement TARGET', file=sys.stderr)
        return 2

    if not prev:
        prev = find_previous_tag(target)
        if not prev:
            print(f"Impossible de déterminer automatiquement la version précédente pour '{target}'.", file=sys.stderr)
            print("Passez --prev ou exportez PREV=<tag>.")
            return 3

    tpl_path = Path(TEMPLATE_PATH)
    if not tpl_path.exists():
        print(f"Template introuvable: {tpl_path}", file=sys.stderr)
        return 4

    tpl = tpl_path.read_text(encoding='utf-8')
    changelog = build_changelog(prev, target)

    try:
        rendered = tpl.format(previous_version=prev, target_version=target, changelog=changelog)
    except Exception as e:
        print('Erreur lors du rendu du template:', e, file=sys.stderr)
        return 5

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # tenter de construire l'URL GitHub compare depuis le remote 'origin' ou l'option --repo
    def git_remote_http_url() -> str | None:
        try:
            url = run(['git', 'remote', 'get-url', 'origin'])
        except Exception:
            return None
        # url peut être de la forme git@github.com:owner/repo.git ou https://github.com/owner/repo.git
        if url.startswith('git@'):
            # git@github.com:owner/repo.git -> owner/repo
            parts = url.split(':', 1)[1]
        elif url.startswith('https://') or url.startswith('http://'):
            parts = url.split('://', 1)[1].split('/', 1)[1]
        else:
            return None
        parts = parts.rstrip('.git')
        return f'https://github.com/{parts}'

    # priorité à l'argument --repo (ou variable d'environnement REPO)
    repo_arg = args.repo or os.environ.get('REPO')
    remote_base = None
    if repo_arg:
        repo = repo_arg.strip()
        # accepter une URL complète ou owner/repo
        if repo.startswith('http://') or repo.startswith('https://'):
            # extraire la partie owner/repo
            repo = repo.split('://', 1)[1].split('/', 1)[1]
        repo = repo.rstrip('.git').strip('/')
        remote_base = f'https://github.com/{repo}'
    else:
        remote_base = git_remote_http_url()

    compare_url = None
    if remote_base:
        compare_url = f"{remote_base}/compare/{prev}...{target}"

    if compare_url:
        rendered = rendered.rstrip() + "\n\n" + "Comparaison complète : " + compare_url + "\n"

    out_path.write_text(rendered, encoding='utf-8')

    print(f'Notes de release générées: {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
