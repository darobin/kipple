
import React from 'react';
import { Editor, EditorState, ContentState, convertFromRaw } from 'draft-js';
import Article from './Article';

const defaultContent = {
  blocks: [
    {
      text: ' ',
      type: 'kipple:title',
      entityRanges: [],
    },
    {
      text: ' ',
      type: 'kipple:hunk-list',
      entityRanges: [],
    },
  ],
  entityMap: {},
};

export default class Kipple extends React.Component {
  constructor (props) {
    super(props);
    // TODO: get this from localStorage if available
    const contentState = ContentState.createFromBlockArray(convertFromRaw(defaultContent));
    this.state = { editorState: EditorState.createWithContent(contentState) };
  }
  render () {
    return <Article editorState={this.state.editorState}/>;
  }
}
// HOW TO MAKE THIS WORK
//  - for now, store the data in localStorage and extract it at component load
//  - need a root Article component, that wraps (and they all wrap Editors):
//    - a Title component
//    - a HunkList component
//    - a SectionList component
//  - the Title component takes a depth (so it can be reused) and is basically a simply text
//    edit. On focus it shows some editing affordances. Enter does not create a new line, it
//    moves to the next component in its parent's focus set (HunkList's first hunk or default).
//    It has a placeholder. So
//  - the HunkList component wraps Hunks, that are individual components that can edit themselves.
//    What it does is expose the interface to how to create hunks, including the affordance to
//    create one when everything is empty, the buttons to insert hunks at various points, what
//    happens on enter, tab, etc. (delegated to it by the hunks). It has a focus() method.
//  - the SectionList behaves like the HunkList, but each Section behaves pretty much like the
//    Article
// STEPS
//  - start with just Article that contains just Title
//  - Title just pure text (styled)
//  - get/set/load data
//  - then start into the hunk business
