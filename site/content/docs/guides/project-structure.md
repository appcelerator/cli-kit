---
title: "Project Structure"
---

__cli-kit__ is unopinionated how your project is organized. You can put everything in a single file, break commands into separate files, or break commands into separate CLI's.

## Boilerplate

For starters, your CLI app should have a `bin` entry:

```json
{
    ...
    "bin": {
        "APP_NAME": "./bin/APPNAME"
    },
    ...
}
```

 When your app hits a certain size, it's a good idea to break your commands into seperate files.


before

<div class="ui list">
  <div class="item">
    <i class="folder icon"></i>
    <div class="content">
      <div class="header">src</div>
      <div class="description">Source files for project</div>
      <div class="list">
        <div class="item">
          <i class="folder icon"></i>
          <div class="content">
            <div class="header">site</div>
            <div class="description">Your site's theme</div>
          </div>
        </div>
        <div class="item">
          <i class="folder icon"></i>
          <div class="content">
            <div class="header">themes</div>
            <div class="description">Packaged theme files</div>
            <div class="list">
              <div class="item">
                <i class="folder icon"></i>
                <div class="content">
                  <div class="header">default</div>
                  <div class="description">Default packaged theme</div>
                </div>
              </div>
              <div class="item">
                <i class="folder icon"></i>
                <div class="content">
                  <div class="header">my_theme</div>
                  <div class="description">Packaged themes are also available in this folder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="item">
          <i class="file icon"></i>
          <div class="content">
            <div class="header">theme.config</div>
            <div class="description">Config file for setting packaged themes</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="item">
    <i class="folder icon"></i>
    <div class="content">
      <div class="header">dist</div>
      <div class="description">Compiled CSS and JS files</div>
      <div class="list">
        <div class="item">
          <i class="folder icon"></i>
          <div class="content">
            <div class="header">components</div>
            <div class="description">Individual component CSS and JS</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="item">
    <i class="file icon"></i>
    <div class="content">
      <div class="header">semantic.json</div>
      <div class="description">Contains build settings for gulp</div>
    </div>
  </div>
</div>

after
