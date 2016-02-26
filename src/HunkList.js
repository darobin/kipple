
import React from 'react';
import { Editor, EditorState } from 'draft-js';

export default class HunkList extends React.Component {
  constructor (props) {
    super(props);
    // XXX copy from TeXBlock
  }
  render () {
    // XXX copy from TeXBlock
    // XXX the default button doesn't look like that, it's an affordance to add any hunk type
    return <button>Add hunk</button>;
  }
}
