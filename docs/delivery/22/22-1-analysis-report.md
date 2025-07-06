# 22-1 Reference Plugin Analysis Report

## Overview
This report documents the analysis of `design/reference/sage-api-plugin.html` to inform and de-risk its integration as an iframe in the dual-mode plugin. The goal is to ensure smooth embedding, identify any technical blockers, and provide clear recommendations for asset serving and future migration.

---

## 1. Structural Analysis
- **HTML**: Single, self-contained HTML file with embedded `<style>` and `<script>` tags. No external CSS or JS files referenced.
- **CSS**: All styles are defined inline in the `<head>`. No external fonts or stylesheets loaded.
- **JavaScript**: All logic is contained in `<script>` tags. No external JS libraries or CDNs. Pure vanilla JS.
- **DOM**: UI built with standard HTML elements (divs, forms, buttons, etc.), using IDs/classes for DOM manipulation.

## 2. Dependency Mapping
- **External Dependencies**: None detected. All code and styles are inline.
- **Images/Fonts**: No external images or fonts loaded by default. There is an input for image URLs, but these are user-supplied and not required for core functionality.
- **API Endpoints**: Communicates with parent window via `window.parent.postMessage` for all API actions. Expects to be embedded in a compatible host (e.g., SageModeler or a test harness that implements the Sage API via postMessage).

## 3. Functionality Inventory
- **API Testing**: Full-featured interface for sending SageModeler API requests, viewing responses, and interacting with model elements (nodes, links, etc.).
- **Logging**: Log panel for API responses and debug output.
- **Tabs/Accordion**: UI uses tabbed and accordion sections for organization.
- **Import/Export**: Supports SD-JSON import/export for models.
- **Experimentation**: Includes experiment run logic and simulation controls.

## 4. Integration Assessment
- **Iframe Compatibility**: Designed to be embedded (checks `window.parent !== window` and uses postMessage). No frame-busting code, X-Frame-Options, or CSP headers set in the HTML.
- **Resource Loading**: All resources are inline, so moving the file to `public/` or another static directory will not break functionality.
- **Cross-Origin**: As long as the iframe is served from the same origin as the parent, postMessage will work without CORS issues. If cross-origin, postMessage will still work, but you must validate origins for security.
- **Security**: No obvious security risks. The plugin does not attempt to access cookies, localStorage, or other sensitive APIs.

## 5. Asset Requirements
- **Single File**: Only `sage-api-plugin.html` is required for full functionality.
- **Serving**: Place the file in `public/` for same-origin iframe embedding. No build process changes are needed unless you want to automate copying/updating the file.

## 6. Responsive Design & Accessibility
- **Responsive**: The plugin uses fixed widths for some panels but is generally flexible. The iframe container should be made responsive in the parent React component.
- **Accessibility**: Uses standard HTML elements and labels. No ARIA roles detected, but the structure is accessible to screen readers.

## 7. Potential Issues & Mitigations
- **Iframe Sizing**: The plugin uses fixed panel widths (e.g., 350px for controls). The parent should set the iframe width/height appropriately and consider dynamic resizing if needed.
- **Communication**: All API calls are via postMessage. If you want to coordinate state or events between the main plugin and the iframe, use postMessage with explicit origin checks.
- **Future Migration**: Since all logic is inline, porting to React would require extracting the HTML structure and refactoring JS into components/hooks, but there are no external dependencies to complicate this.

## 8. Recommendations
- **Asset Placement**: Copy `design/reference/sage-api-plugin.html` to `public/sage-api-reference.html` for serving.
- **Iframe Integration**: Use a `<iframe src='/sage-api-reference.html'>` in your React accordion. Set `sandbox` attributes as needed for security.
- **Responsive Container**: Make the iframe container responsive in the parent plugin.
- **Testing**: Test the iframe in local and deployed environments to ensure postMessage works and there are no resource loading issues.
- **Security**: If you ever allow cross-origin embedding, validate postMessage origins in both parent and iframe.

---

## Conclusion
The reference plugin is highly suitable for iframe embedding. It is self-contained, has no external dependencies, and is already designed for postMessage-based API communication. There are no technical blockers for integration, and the asset can be served from the same origin for maximum compatibility. 