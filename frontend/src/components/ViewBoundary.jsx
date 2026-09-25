import React from 'react';

export default class ViewBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error('[Workspace]', error, info); }
  render() {
    if (this.state.failed) return <section className="ops-view-error" role="alert"><h2>This workspace could not be loaded</h2><p>Your station selection is retained. Return to the overview and try opening the workspace again.</p><button className="ops-primary" onClick={this.props.onReturn}>Return to overview</button></section>;
    return this.props.children;
  }
}
