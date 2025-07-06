# PBI-22: Embed Reference SageModeler Plugin via Iframe Integration

[View in Backlog](../backlog.md#user-content-22)

## Overview
Embed the existing reference SageModeler plugin (`design/reference/sage-api-plugin.html`) into the SageModeler side of the current dual-mode plugin using an iframe-based approach. This provides immediate access to the battle-tested SageModeler API testing interface while maintaining complete isolation from existing functionality.

## Problem Statement
The current SageModeler mode in the dual-mode plugin lacks a direct API testing interface. While we have implemented MCP tool translation for SageModeler tools, developers and testers need a way to directly interact with and validate the SageModeler API without going through the LLM workflow. The reference plugin at `design/reference/sage-api-plugin.html` provides this functionality but exists as a separate, standalone tool.

## User Stories

**Primary Story**: As a developer, I want the reference SageModeler plugin embedded in the dual-mode plugin so that I can test SageModeler APIs directly without switching between applications.

**Supporting Stories**:
- As a tester, I want to access SageModeler API testing tools within the main plugin interface for streamlined workflow
- As a QA engineer, I want to verify SageModeler functionality using both LLM-driven and direct API approaches in the same interface
- As a developer, I want the embedded plugin to be completely isolated so it doesn't interfere with existing CODAP functionality
- As a future developer, I want the iframe integration structured to enable easy migration to direct React integration if needed

## Technical Approach

### **Architecture: Iframe-Based Embedding**

#### **Core Implementation Strategy**
1. **Accordion Integration**: Add new accordion section to `SageModelerAPIPanel.tsx`
2. **Iframe Embedding**: Embed reference plugin as iframe within accordion
3. **File Serving**: Ensure reference plugin is accessible via public path
4. **Isolation**: Leverage iframe's natural isolation for CSS and JavaScript
5. **Communication**: Implement postMessage API if cross-iframe coordination is needed

#### **File Structure Changes**
```
src/components/
├── SageModelerAPIPanel.tsx (enhanced with accordion)
├── SageAPIEmbeddedPanel.tsx (new - iframe container)
└── SageModelerAPIPanel.css (enhanced styling)

public/ or src/assets/
└── sage-api-reference.html (copy of reference plugin)
```

#### **Key Architectural Decisions**

**1. Iframe Approach Benefits**:
- **Zero Integration Risk**: Complete isolation prevents disruption of existing functionality
- **Preservation of Functionality**: Reference plugin works exactly as designed
- **CSS Isolation**: No style conflicts between plugins
- **Quick Implementation**: Minimal code changes required
- **Battle-Tested Code**: Reference plugin is already validated and functional

**2. Serving Strategy**:
- Copy reference plugin to public directory for same-origin serving
- Ensure build process includes reference plugin in deployments
- Configure proper MIME types and caching headers

**3. Communication Patterns**:
- Initial implementation: Complete iframe isolation
- Optional: PostMessage API for coordination (resize, state sharing)
- Future migration path: Structured for eventual React component conversion

#### **Implementation Plan**

**Phase 1: Basic Iframe Integration**
1. Create iframe container component
2. Copy reference plugin to accessible location
3. Add accordion section to SageModeler panel
4. Implement basic responsive iframe sizing
5. Test functionality and integration

**Phase 2: Enhanced Integration** (Optional Future)
1. PostMessage communication for better UX
2. State synchronization if beneficial
3. Responsive design improvements
4. Migration path to direct React integration

### **Cross-Origin and Security Considerations**

#### **Same-Origin Strategy**
- Serve reference plugin from same domain to avoid CORS issues
- Use relative paths for iframe src attribute
- Ensure proper Content Security Policy configuration

#### **Iframe Security**
- Sandbox attribute configuration for security
- Restriction of unnecessary permissions
- Content validation and sanitization

#### **Communication Security**
- Origin validation for postMessage events
- Message content validation and sanitization
- Minimal data exposure between contexts

### **Responsive Design Strategy**

#### **Iframe Sizing**
- Dynamic height adjustment based on content
- Responsive width handling
- Mobile-friendly accordion behavior
- Overflow handling for complex interfaces

#### **Integration with Existing UI**
- Consistent accordion styling with existing panels
- Proper spacing and padding
- Loading states and error handling
- Accessibility considerations

## UX/UI Considerations

### **User Interface Integration**
- **Accordion Placement**: Bottom of SageModeler mode accordion list
- **Section Title**: "Direct SageModeler API Testing"
- **Loading States**: Spinner while iframe loads
- **Error Handling**: Fallback message if iframe fails to load
- **Responsive Behavior**: Collapsible on mobile, full-width on desktop

### **User Experience Flow**
1. User switches to SageModeler mode
2. User expands "Direct SageModeler API Testing" accordion
3. Reference plugin loads in iframe
4. User interacts with familiar SageModeler interface
5. All API calls function exactly as in standalone plugin

### **Accessibility**
- Proper ARIA labels for iframe content
- Keyboard navigation support
- Screen reader compatibility
- Focus management between main plugin and iframe

## Acceptance Criteria

### **Functional Requirements**
1. **Iframe Integration**: Reference plugin loads successfully in accordion iframe
2. **Full Functionality**: All SageModeler API testing features work as in standalone plugin
3. **Isolation**: No interference with existing CODAP functionality
4. **Responsive Design**: Iframe adapts to different screen sizes appropriately
5. **Build Integration**: Reference plugin included in deployment builds

### **Technical Requirements**
1. **Same-Origin Serving**: Reference plugin served from same domain
2. **CSS Isolation**: No style conflicts between main plugin and iframe
3. **Error Handling**: Graceful handling of iframe loading failures
4. **Performance**: No significant impact on main plugin load times
5. **Security**: Proper iframe sandbox and CSP configuration

### **Quality Requirements**
1. **Testing**: Integration tests verify iframe loading and functionality
2. **Documentation**: Clear documentation of implementation approach
3. **Migration Path**: Code structured to enable future direct integration
4. **Maintainability**: Clean separation of concerns and minimal complexity

## Dependencies

### **Technical Dependencies**
- Existing SageModeler mode in dual-mode plugin
- Reference plugin at `design/reference/sage-api-plugin.html`
- Build system configuration for asset serving
- Web server configuration for proper MIME types

### **External Dependencies**
- SageModeler API endpoints (already configured)
- Existing plugin authentication and session management
- Browser iframe and postMessage API support

## Open Questions

### **Implementation Details**
1. **Asset Serving**: Should reference plugin be in `public/` or `src/assets/`?
2. **Build Process**: How to ensure reference plugin is included in all deployment environments?
3. **Iframe Sizing**: Fixed height vs. dynamic sizing based on content?
4. **Communication**: Is postMessage communication needed for initial implementation?

### **Future Considerations**
1. **Migration Strategy**: What criteria would trigger migration to direct React integration?
2. **State Sharing**: Would synchronized state between main plugin and iframe provide value?
3. **Performance Optimization**: Are there iframe loading optimizations worth implementing?
4. **Feature Parity**: Should embedded plugin have same features as standalone version?

## Related Tasks

Tasks will be defined in [tasks.md](./tasks.md) when this PBI moves from Proposed to Agreed status, following the established task breakdown and documentation process.

## Migration Path for Future Direct Integration

### **Preparation for React Migration**
- Document all reference plugin components and their functionality
- Identify reusable CSS patterns and component structures
- Map JavaScript functionality to potential React hooks and components
- Design state management approach for direct integration

### **Structured Approach**
- Maintain clean separation between iframe container and embedded content
- Design component interfaces that could be replaced with direct React components
- Document communication patterns that would translate to React prop passing
- Plan CSS migration strategy from global styles to React component styles

This PBI provides immediate functionality through proven iframe integration while maintaining a clear path toward deeper React integration in the future. 