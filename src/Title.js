
import React from 'react';
import { Editor, EditorState } from 'draft-js';

export default class Title extends React.Component {
  constructor (props) {
    super(props);
    // XXX copy from TeXBlock, add sub-editor inside the h1 (or whatever level)
  }
  render () {
    // XXX copy from TeXBlock
    //  add an Editor here
    //  give it a handleReturn that triggers the next tab (maybe with ally.js?) and returns true
    //  (similar things for onTab, on*Arrow)
    return <h1>Title</h1>;
  }
}
