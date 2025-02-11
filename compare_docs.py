#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path
from typing import Set, List, Tuple

def get_file_structure(base_path: str) -> Set[str]:
    """Get all .mdx files in the given directory recursively."""
    files = set()
    for root, _, filenames in os.walk(base_path):
        for filename in filenames:
            if filename.endswith('.mdx'):
                # Get relative path from the language folder
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, base_path)
                files.add(rel_path)
    return files

def get_modified_es_files() -> List[str]:
    """Get list of modified .mdx files in /es folder using git status."""
    try:
        # Run git status command
        result = subprocess.run(['git', 'status', '--porcelain', 'es/'], 
                              capture_output=True, 
                              text=True, 
                              check=True)
        
        modified_files = []
        for line in result.stdout.splitlines():
            # Check if file is modified (M) and is an .mdx file
            if line.startswith(' M') and line.strip().endswith('.mdx'):
                # Extract the file path
                file_path = line[3:].strip()
                modified_files.append(file_path)
        
        return modified_files
    except subprocess.CalledProcessError:
        print("Warning: Unable to get git status. Make sure you're in a git repository.")
        return []

def generate_new_files_prompt(differences: List[str]) -> str:
    """Generate an LLM prompt for creating new files."""
    if not differences:
        return "No new files need to be created. All documentation files exist across languages."
    
    prompt = """The current project is a documentation aimed at creating a knowledge base of the treble.ai SaaS B2B product. We want to maintain accuracy and consistency for the documentation that is available in 3 languages. The source of truth is the /es folder.

For the following list of files, create their relevant files translated into the appropriate languages in the /en and /pt folders. Make sure:

1. DO NOT create other new files different from the ones in the difference
2. KEEP the filename and structure
3. For the translation, make sure internal links like images are kept but internal links that reference other sub-links of the same language are translated
4. Translate each file, but strictly do not add any new additional content. Content must be preserved, just translated.

Files to process:
"""
    
    for diff in differences:
        prompt += f"{diff}\n"
        
    return prompt

def generate_updates_prompt(modified_files: List[str]) -> str:
    """Generate an LLM prompt for updating existing files."""
    if not modified_files:
        return "No files have been modified in the /es folder."
    
    prompt = """The current project is a documentation aimed at creating a knowledge base of the treble.ai SaaS B2B product. We want to maintain accuracy and consistency for the documentation that is available in 3 languages. The source of truth is the /es folder.

The following files in the /es folder have been modified. Please update their corresponding files in the /en and /pt folders to reflect these changes. Make sure:

1. Only translate the modified content, keeping the rest of the file unchanged, if parts of the file have already been translated, only translate the modified parts
2. Maintain the same structure and formatting as the Spanish version
3. For the translation, make sure internal links like images are kept but internal links that reference other sub-links of the same language are translated
4. Do not add or remove any content that wasn't modified in the Spanish version

Modified files to process:
"""
    
    for file in modified_files:
        prompt += f"- {file}\n"
        
    return prompt

def main():
    # Base paths
    es_path = "es"
    en_path = "en"
    pt_path = "pt"
    
    # Get file structures
    es_files = get_file_structure(es_path)
    en_files = get_file_structure(en_path)
    pt_files = get_file_structure(pt_path)
    
    print("Analyzing documentation folders...")
    
    # Get structural differences
    differences = []
    
    # Check for files in ES that don't exist in other languages
    for file in es_files:
        en_exists = os.path.exists(os.path.join(en_path, file))
        pt_exists = os.path.exists(os.path.join(pt_path, file))
        
        if not en_exists and not pt_exists:
            differences.append(f"- es/{file} found, not created in /en or /pt")
        elif not en_exists:
            differences.append(f"- es/{file} found, not created in /en")
        elif not pt_exists:
            differences.append(f"- es/{file} found, not created in /pt")

    # Check for files in EN that don't exist in ES
    for file in en_files:
        if file not in es_files:
            differences.append(f"- en/{file} exists but not in /es")

    # Check for files in PT that don't exist in ES
    for file in pt_files:
        if file not in es_files:
            differences.append(f"- pt/{file} exists but not in /es")

    # Get modified files
    modified_files = get_modified_es_files()

    # Generate and print the prompts
    print("\nPrompt for Creating New Files:")
    print("=" * 80)
    print(generate_new_files_prompt(differences))
    print("=" * 80)

    print("\nPrompt for Updating Modified Files:")
    print("=" * 80)
    print(generate_updates_prompt(modified_files))
    print("=" * 80)

if __name__ == "__main__":
    main() 