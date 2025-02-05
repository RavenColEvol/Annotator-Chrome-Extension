# Annotator-Chrome-Extension

This a simple chrome extension to annotate any website

<br>

# Usage

Hover on any element :

- To **create** an annotation : `Click` on it
- To **delete** an annotation : `Atl + Click` on it
- To **edit** an annotation : `Shift + Click` on it
  - A modal will popup. Edit the editable fields and click on `Edit` button to update the values and close the modal

<br>

# Todo

- [ ] Full page webpage screenshot
- [x] Batch create based on `className`, `tagName`, etc.
- [x] Configuration settings ( from `popup.js`)
- [] Push to server :
    - Pass data from `contentScript.js` to `popup.js`
    - Get URL from user in `popup.html` and push the data

<br>

- [] Multiple delete ( say by holding `Ctrl` while clicking )
- [] (OPTIONAL) Undo / Redo feature
  - Maintain a stack to record activities 

<br>

# Known issues

- Batch create needs to check for uniqueness of a label. Currently, it adds the label even if they are already present in the global list. **Proposed Solution** : Identify a label using `XPath` and / or `HTML className or id`.