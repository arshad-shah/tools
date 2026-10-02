export interface XMLNode {
  nodeName: string;
  nodeType: number;
  childNodes: NodeListOf<ChildNode>;
  attributes: NamedNodeMap;
  nodeValue: string | null;
}

/** JSON shape of an XML element: `@attributes`, `#text` and child elements. */
export type XmlJson = Record<string, unknown>;

export const xmlToJson = (node: XMLNode): XmlJson => {
  const obj: XmlJson = {};
  if (node.nodeType === 1) {
    if (node.attributes?.length > 0) {
      const attributes: Record<string, string | null> = {};
      obj['@attributes'] = attributes;
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        attributes[attr.nodeName] = attr.nodeValue;
      }
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 1) {
        const childData = xmlToJson(child as unknown as XMLNode);
        const existing = obj[child.nodeName];
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(childData);
          } else {
            obj[child.nodeName] = [existing, childData];
          }
        } else {
          obj[child.nodeName] = childData;
        }
      } else if (child.nodeType === 3 && child.nodeValue?.trim()) {
        obj['#text'] = child.nodeValue.trim();
      }
    }
  }
  return obj;
};

export const formatXML = (xml: string) => {
  let formatted = '';
  let indent = '';
  const tab = '  ';
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
    formatted += indent + '<' + node + '>\n';
    // An opening tag (any name length, not self-closing, no inline text).
    if (node.match(/^<?\w(?:[^>]*[^/])?$/)) indent += tab;
  });
  return formatted.substring(1, formatted.length - 2);
};
