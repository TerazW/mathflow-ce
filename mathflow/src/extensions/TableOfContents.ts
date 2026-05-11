import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
    };
  }
}

interface HeadingEntry {
  text: string;
  level: number;
  pos: number;
}

function collectHeadings(doc: import('@tiptap/pm/model').Node): HeadingEntry[] {
  const out: HeadingEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = (node.textContent || '').trim();
      if (text) {
        out.push({ text, level: node.attrs.level || 1, pos });
      }
      return false;
    }
    return undefined;
  });
  return out;
}

function flashElement(el: HTMLElement) {
  el.classList.remove('env-jump-flash');
  void el.offsetWidth;
  el.classList.add('env-jump-flash');
  setTimeout(() => el.classList.remove('env-jump-flash'), 1600);
}

export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="table-of-contents"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'table-of-contents',
        class: 'toc-block',
      }),
      ['div', { class: 'toc-block-title' }, 'Contents'],
    ];
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      dom.className = 'toc-block';
      dom.setAttribute('data-type', 'table-of-contents');
      dom.contentEditable = 'false';

      const title = document.createElement('div');
      title.className = 'toc-block-title';
      title.textContent = 'Contents';
      dom.appendChild(title);

      const list = document.createElement('div');
      list.className = 'toc-block-list';
      dom.appendChild(list);

      const empty = document.createElement('div');
      empty.className = 'toc-block-empty';
      empty.textContent = 'No headings yet — add an H1/H2/H3 heading to populate.';
      dom.appendChild(empty);

      function render() {
        const headings = collectHeadings(props.editor.state.doc);
        list.innerHTML = '';
        if (headings.length === 0) {
          empty.style.display = '';
          list.style.display = 'none';
          return;
        }
        empty.style.display = 'none';
        list.style.display = '';

        for (const h of headings) {
          const row = document.createElement('div');
          row.className = `toc-block-item toc-level-${h.level}`;
          row.textContent = h.text;
          row.title = 'Jump to section';
          row.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const view = props.editor.view;
            const headingDom = view.nodeDOM(h.pos) as HTMLElement | null;
            if (headingDom) {
              headingDom.scrollIntoView({ behavior: 'smooth', block: 'center' });
              flashElement(headingDom);
            }
          });
          list.appendChild(row);
        }
      }

      render();

      const updateHandler = () => render();
      props.editor.on('update', updateHandler);

      return {
        dom,
        update: () => true,
        ignoreMutation: () => true,
        destroy: () => {
          props.editor.off('update', updateHandler);
        },
      };
    };
  },
});
