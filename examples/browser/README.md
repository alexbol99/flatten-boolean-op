# Example: @flatten-js/boolean-op in a browser

This example illustrates usage of boolean-op together with flatten-js library in a browser.
It works "as is" without transpiling in most of the modern browsers.
Project uses https://unpkg tool to deliver packages from npm.
Unpkg attaches package to the **window** global scope under the name ```boolean-op```,
from where the functions ```unify```, 
 ```subtract```, ```intersect``` may be destructed.
 
## Usage

Move index.html file into browser and see svg graphics created

## Known issues

Does not work in IE.

