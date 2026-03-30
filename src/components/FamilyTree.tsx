'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { FamilyMember, TreeNode, HighlightState } from '@/types';
import { TreeNodeComponent } from './TreeNode';

interface TreeLayoutNode {
  treeNode: TreeNode;
  x: number;
  y: number;
  coupleWidth: number;
}

interface Connection {
  fromX: number; fromY: number;
  toX: number; toY: number;
  isHighlighted: boolean;
  highlightColor: string;
}

const NODE_WIDTH = 90;
const COUPLE_GAP = 32;
const SIBLING_GAP = 28;
const LEVEL_HEIGHT = 165;
const AVATAR_SIZE = 72;
const PADDING = 60; // left/right padding so tree never clips

function getMemberWidth(node: TreeNode): number {
  return NODE_WIDTH + node.spouses.length * (NODE_WIDTH + COUPLE_GAP);
}

function calcSubtreeWidth(node: TreeNode): number {
  if (node.children.length === 0) return getMemberWidth(node);
  const childrenWidth = node.children.reduce(
    (sum, child) => sum + calcSubtreeWidth(child) + SIBLING_GAP, -SIBLING_GAP
  );
  return Math.max(getMemberWidth(node), childrenWidth);
}

function layoutTree(nodes: TreeNode[]): {
  layouts: Map<string, TreeLayoutNode>;
  totalWidth: number;
  totalHeight: number;
} {
  const layouts = new Map<string, TreeLayoutNode>();

  function placeNode(node: TreeNode, x: number, y: number) {
    const coupleWidth = getMemberWidth(node);
    layouts.set(node.member.id, { treeNode: node, x, y, coupleWidth });

    if (node.children.length > 0) {
      const totalChildWidth = node.children.reduce(
        (sum, child) => sum + calcSubtreeWidth(child) + SIBLING_GAP, -SIBLING_GAP
      );
      // Center children under the couple unit
      let childX = x + coupleWidth / 2 - totalChildWidth / 2;
      for (const child of node.children) {
        const w = calcSubtreeWidth(child);
        placeNode(child, childX, y + LEVEL_HEIGHT);
        childX += w + SIBLING_GAP;
      }
    }
  }

  // First pass: place all roots left-to-right
  let cursorX = PADDING;
  for (const root of nodes) {
    const w = calcSubtreeWidth(root);
    placeNode(root, cursorX, PADDING);
    cursorX += w + SIBLING_GAP * 2;
  }

  // Second pass: find the minimum x across ALL placed nodes
  // Children that are wider than parent can end up with negative x
  let minX = Infinity;
  for (const layout of layouts.values()) {
    minX = Math.min(minX, layout.x);
  }

  // Shift everything right if anything went negative (or too close to edge)
  const shift = minX < PADDING ? PADDING - minX : 0;
  if (shift > 0) {
    for (const layout of layouts.values()) {
      layout.x += shift;
    }
  }

  // Calculate total canvas size
  let maxX = 0, maxY = 0;
  for (const layout of layouts.values()) {
    maxX = Math.max(maxX, layout.x + layout.coupleWidth);
    maxY = Math.max(maxY, layout.y + AVATAR_SIZE + 70);
  }

  return { layouts, totalWidth: maxX + PADDING, totalHeight: maxY + PADDING };
}

interface FamilyTreeProps {
  roots: TreeNode[];
  memberMap: Map<string, FamilyMember>;
  highlight: HighlightState | null;
  onNodeClick: (member: FamilyMember) => void;
  focusId: string | null;
}

export function FamilyTree({ roots, memberMap, highlight, onNodeClick, focusId }: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layout, setLayout] = useState<{
    layouts: Map<string, TreeLayoutNode>;
    totalWidth: number;
    totalHeight: number;
  } | null>(null);

  useEffect(() => {
    setLayout(layoutTree(roots));
  }, [roots]);

  useEffect(() => {
    if (!focusId || !containerRef.current) return;
    const el = nodeRefs.current.get(focusId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [focusId]);

  const getHighlight = useCallback((memberId: string) => {
    if (!highlight || !highlight.highlightedIds.size) return 'none' as const;
    if (memberId === highlight.foundId) return 'self' as const;
    if (highlight.highlightedIds.has(memberId))
      return highlight.mode === 'descendants' ? 'green' as const : 'blue' as const;
    return 'dimmed' as const;
  }, [highlight]);

  const buildConnections = useCallback((): Connection[] => {
    if (!layout) return [];
    const connections: Connection[] = [];

    for (const [memberId, layoutNode] of layout.layouts) {
      const { treeNode, x, y, coupleWidth } = layoutNode;
      const parentCenterX = x + coupleWidth / 2;
      const parentBottomY = y + AVATAR_SIZE / 2 + 14;

      for (const child of treeNode.children) {
        const childLayout = layout.layouts.get(child.member.id);
        if (!childLayout) continue;
        const childCenterX = childLayout.x + childLayout.coupleWidth / 2;
        const childTopY = childLayout.y + AVATAR_SIZE / 2 - 4;

        const bothHighlighted =
          highlight?.highlightedIds.has(memberId) &&
          highlight?.highlightedIds.has(child.member.id);

        connections.push({
          fromX: parentCenterX,
          fromY: parentBottomY,
          toX: childCenterX,
          toY: childTopY,
          isHighlighted: !!bothHighlighted,
          highlightColor: highlight?.mode === 'descendants' ? 'var(--green)' : 'var(--blue)',
        });
      }
    }
    return connections;
  }, [layout, highlight]);

  if (!layout) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-subtle)]">
      <div className="text-sm animate-pulse">Menyusun pohon silsilah...</div>
    </div>
  );

  const connections = buildConnections();

  return (
    <div
      ref={containerRef}
      className="tree-scroll-container relative"
      style={{ minWidth: layout.totalWidth, minHeight: layout.totalHeight }}
    >
      {/* SVG connectors */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={layout.totalWidth}
        height={layout.totalHeight}
      >
        {connections.map((conn, i) => {
          const midY = conn.fromY + (conn.toY - conn.fromY) * 0.45;
          const path = `M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${midY}, ${conn.toX} ${midY}, ${conn.toX} ${conn.toY}`;
          return (
            <path
              key={i}
              d={path}
              fill="none"
              className={`tree-connector ${conn.isHighlighted
                ? (highlight?.mode === 'descendants' ? 'highlight-green' : 'highlight-blue')
                : ''}`}
              stroke={conn.isHighlighted ? conn.highlightColor : 'var(--connector)'}
              strokeWidth={conn.isHighlighted ? 2 : 1.5}
              opacity={!highlight || !highlight.highlightedIds.size ? 1 : conn.isHighlighted ? 1 : 0.12}
            />
          );
        })}
      </svg>

      {/* Node layer */}
      <div className="relative" style={{ width: layout.totalWidth, height: layout.totalHeight }}>
        {[...layout.layouts.values()].map(({ treeNode, x, y }) => {
          const member = treeNode.member;
          return (
            <div key={member.id} className="absolute" style={{ left: x, top: y }}>
              <TreeNodeComponent
                member={member}
                spouses={treeNode.spouses}
                spouseMarriages={treeNode.spouseMarriages}
                highlight={getHighlight(member.id)}
                spouseHighlight={(spouse) => getHighlight(spouse.id)}
                onClick={onNodeClick}
                nodeRef={(el) => { if (el) nodeRefs.current.set(member.id, el); }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
