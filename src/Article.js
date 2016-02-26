
import React from 'react';
import { Editor, EditorState } from 'draft-js';
import Title from './Title';
import HunkList from './HunkList';

export default class Article extends React.Component {
  constructor (props) {
    super(props);
    this.state = { editorState: this.props.editorState };
    this.onChange = (editorState) => this.setState({ editorState });
    this._blockRenderer = (block) => {
      let blockType = block.getType();
      if (blockType === 'kipple:title') {
        return {
          component: Title,
          props: {
            onStartEdit: (blockKey) => {
              // XXX need to bind here somehow
              // var {liveTeXEdits} = this.state;
              // this.setState({liveTeXEdits: liveTeXEdits.set(blockKey, true)});
            },
            onFinishEdit: (blockKey) => {
              // XXX need to bind here somehow
              // var {liveTeXEdits} = this.state;
              // this.setState({liveTeXEdits: liveTeXEdits.remove(blockKey)});
            },
          },
        };
      }
      else if (blockType === 'kipple:hunk-list') {
        return {
          component: HunkList,
          props: {
            onStartEdit: (blockKey) => {
              // XXX need to bind here somehow
              // var {liveTeXEdits} = this.state;
              // this.setState({liveTeXEdits: liveTeXEdits.set(blockKey, true)});
            },
            onFinishEdit: (blockKey) => {
              // XXX need to bind here somehow
              // var {liveTeXEdits} = this.state;
              // this.setState({liveTeXEdits: liveTeXEdits.remove(blockKey)});
            },
          },
        };
      }
      return null;
    };
  }
  render () {
    return <Editor
              editorState={this.state.editorState}
              onChange={this.onChange}
              blockRendererFn={this._blockRenderer}
            />;
  }
}
