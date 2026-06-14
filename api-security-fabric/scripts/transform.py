import os
import re

# Base paths
script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(script_dir)
spec_path = os.path.join(base_dir, "contracts/api-spec.yaml")
profiles_dir = os.path.join(base_dir, "config/security-profiles")
output_path = os.path.join(base_dir, "config/kong.yaml")

# Load plugins for each security profile from files
def load_profile_plugins(profile_name):
    profile_file = os.path.join(profiles_dir, f"{profile_name.replace('_api', '')}.yaml")
    if not os.path.exists(profile_file):
        # Fallback defaults if file doesn't exist
        return []
    
    with open(profile_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple YAML chunk extractor for plugins
    plugins = []
    plugin_blocks = content.split("- name:")
    for block in plugin_blocks[1:]:
        lines = block.splitlines()
        plugin_name = lines[0].strip()
        config_lines = []
        in_config = False
        for line in lines[1:]:
            if line.startswith("    config:"):
                in_config = True
                continue
            if in_config:
                if line.startswith("      ") or line.strip() == "":
                    config_lines.append(line)
                else:
                    break
        
        plugins.append({
            "name": plugin_name,
            "config": "\n".join(config_lines)
        })
    return plugins

# Parse OpenAPI spec for routes and profiles
routes = []
with open(spec_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

current_path = None
current_method = None
current_operation_id = None
current_profile = None

# A simple parser to extract paths, methods, and profiles
for i, line in enumerate(lines):
    # Detect path definition
    path_match = re.match(r'^  (/api/v1/\S+):', line)
    if path_match:
        current_path = path_match.group(1)
        current_method = None
        current_profile = None
        continue
    
    if current_path:
        # Detect HTTP method
        method_match = re.match(r'^    (get|post|put|patch|delete):', line)
        if method_match:
            current_method = method_match.group(1)
            current_profile = None
            continue
        
        # Detect security profile
        profile_match = re.match(r'^      x-security-profile:\s*(\S+)', line)
        if profile_match and current_method:
            current_profile = profile_match.group(1)
            # Create a unique route name
            route_name = current_path.strip("/").replace("/", "-").replace("{", "").replace("}", "") + f"-{current_method}"
            routes.append({
                "name": route_name,
                "path": current_path.replace("{", "(?<").replace("}", ">[^/]+)"), # convert swagger path parameters to regex for Kong
                "method": current_method.upper(),
                "profile": current_profile
            })

# Generate kong.yaml
yaml_output = []
yaml_output.append('_format_version: "3.0"')
yaml_output.append('services:')
yaml_output.append('  - name: nsia-backend-service')
yaml_output.append('    url: http://nsia-api-metier:8000') # NSIA backend service inside docker
yaml_output.append('    routes:')

for r in routes:
    yaml_output.append(f'      - name: {r["name"]}')
    yaml_output.append('        paths:')
    path_val = r["path"]
    if "(?<" in path_val:
        path_val = "~" + path_val
    yaml_output.append(f'          - {path_val}')
    yaml_output.append('        methods:')
    yaml_output.append(f'          - {r["method"]}')
    
    # Load and inject plugins for this profile
    plugins = load_profile_plugins(r["profile"])
    if plugins:
        yaml_output.append('        plugins:')
        for p in plugins:
            yaml_output.append(f'          - name: {p["name"]}')
            if p["config"]:
                yaml_output.append('            config:')
                for config_line in p["config"].splitlines():
                    # re-indent
                    yaml_output.append("          " + config_line)

# Append Keycloak service to restore access through the gateway
yaml_output.append('  - name: keycloak-service')
yaml_output.append('    url: http://keycloak-iam:8080')
yaml_output.append('    routes:')
yaml_output.append('      - name: keycloak-ui-route')
yaml_output.append('        paths:')
yaml_output.append('          - /')
yaml_output.append('        strip_path: false')

# Ensure the output directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(yaml_output) + "\n")


print(f"Generated {output_path} successfully with {len(routes)} routes!")
