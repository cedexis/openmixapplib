#!/usr/bin/env ruby

# Used for parsing the `applib.yaml` file for each app
require "yaml"

# Used for traversing the App Library directory tree
require "find"

# Use the directory containing this script file as the base for all of the
# paths in the script.
def relative_to_base(filename)
    base_dir = File.dirname(__FILE__)
    File.join(base_dir, "..", filename)
end

# Extract the interesting parts of the core readme for use in each App's
# readme.
base_readme = File.read(relative_to_base("readme.md"))
base_readme = base_readme.split("\n## Directories")[0]

# Traverse all of the Apps to rewrite each App's readme file based on
# the info in the App's `applib.yaml` file and the base readme file.
Find.find(relative_to_base("apps")) do |f|
    if f.match(/\.yaml\Z/)
        # Pull out the App name and description
        app_info = YAML::load(File.read(f))
        app_name = app_info["name"]
        app_description = app_info["description"]

        # Write a new `readme.rb` file
        dir_name = File.dirname(f)
        readme_full_path = File.join(dir_name, "readme.md")
        File.open(readme_full_path, 'w') do |w|
            new_readme = <<README
# Application: **#{app_name}**

#{app_description}
#{base_readme}
README
            w.write(new_readme)
        end
    end
end
