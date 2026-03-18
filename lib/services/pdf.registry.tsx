import { View, Text, Image, Svg, Path, Rect, Circle } from '@react-pdf/renderer';
import type { RenderComponentRegistry } from '@json-render/react-pdf/render';

// Custom components with fixed={true} to repeat on every page
function FixedViewComponent({ element, children }: { element: { props: Record<string, unknown> }; children?: React.ReactNode }) {
  const p = element.props;
  return (
    <View
      fixed
      style={{
        position: (p.position as 'absolute' | 'relative') ?? undefined,
        top: (p.top as number) ?? undefined,
        bottom: (p.bottom as number) ?? undefined,
        left: (p.left as number) ?? undefined,
        right: (p.right as number) ?? undefined,
        padding: (p.padding as number) ?? undefined,
        paddingTop: (p.paddingTop as number) ?? undefined,
        paddingBottom: (p.paddingBottom as number) ?? undefined,
        paddingLeft: (p.paddingLeft as number) ?? undefined,
        paddingRight: (p.paddingRight as number) ?? undefined,
        margin: (p.margin as number) ?? undefined,
        backgroundColor: (p.backgroundColor as string) ?? undefined,
        borderWidth: (p.borderWidth as number) ?? undefined,
        borderColor: (p.borderColor as string) ?? undefined,
        borderRadius: (p.borderRadius as number) ?? undefined,
        flex: (p.flex as number) ?? undefined,
        alignItems: (p.alignItems as 'flex-start' | 'center' | 'flex-end' | 'stretch') ?? undefined,
        justifyContent: (p.justifyContent as 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around') ?? undefined,
      }}
    >
      {children}
    </View>
  );
}

function FixedRowComponent({ element, children }: { element: { props: Record<string, unknown> }; children?: React.ReactNode }) {
  const p = element.props;
  return (
    <View
      fixed
      style={{
        flexDirection: 'row',
        gap: (p.gap as number) ?? undefined,
        alignItems: (p.alignItems as 'flex-start' | 'center' | 'flex-end' | 'stretch') ?? undefined,
        justifyContent: (p.justifyContent as 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around') ?? undefined,
        padding: (p.padding as number) ?? undefined,
        flex: (p.flex as number) ?? undefined,
        flexWrap: p.wrap ? 'wrap' : undefined,
      }}
    >
      {children}
    </View>
  );
}

function FixedTextComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  return (
    <Text
      fixed
      style={{
        fontSize: (p.fontSize as number) ?? 12,
        color: (p.color as string) ?? undefined,
        textAlign: (p.align as 'center' | 'left' | 'right') ?? 'left',
        fontFamily:
          p.fontWeight === 'bold' && p.fontStyle === 'italic'
            ? 'Helvetica-BoldOblique'
            : p.fontWeight === 'bold'
              ? 'Helvetica-Bold'
              : p.fontStyle === 'italic'
                ? 'Helvetica-Oblique'
                : 'Helvetica',
        lineHeight: (p.lineHeight as number) ?? undefined,
      }}
    >
      {p.text as string}
    </Text>
  );
}

function FixedImageComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      fixed
      src={p.src as string}
      style={{
        width: (p.width as number) ?? undefined,
        height: (p.height as number) ?? undefined,
        objectFit: (p.objectFit as 'contain' | 'cover' | 'fill' | 'none') ?? 'contain',
      }}
    />
  );
}

function FixedDividerComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  return (
    <View
      fixed
      style={{
        borderBottomWidth: (p.thickness as number) ?? 1,
        borderBottomColor: (p.color as string) ?? '#e5e7eb',
        marginTop: (p.marginTop as number) ?? 8,
        marginBottom: (p.marginBottom as number) ?? 8,
      }}
    />
  );
}

function FixedSpacerComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  return <View fixed style={{ height: (p.height as number) ?? 20 }} />;
}

function FixedColumnComponent({ element, children }: { element: { props: Record<string, unknown> }; children?: React.ReactNode }) {
  const p = element.props;
  return (
    <View
      fixed
      style={{
        flexDirection: 'column',
        gap: (p.gap as number) ?? undefined,
        alignItems: (p.alignItems as 'flex-start' | 'center' | 'flex-end' | 'stretch') ?? undefined,
        justifyContent: (p.justifyContent as 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around') ?? undefined,
        padding: (p.padding as number) ?? undefined,
        flex: (p.flex as number) ?? undefined,
      }}
    >
      {children}
    </View>
  );
}

function RichTextComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  const text = (p.text as string) ?? '';
  const fontSize = (p.fontSize as number) ?? 9;
  const color = (p.color as string) ?? '#000';
  const lineHeight = (p.lineHeight as number) ?? undefined;

  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text
      style={{ fontSize, color, lineHeight, fontFamily: 'Helvetica' }}
    >
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

function HimeoLogoComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  const width = (p.width as number) ?? 80;
  const height = (p.height as number) ?? 18;
  // Original viewBox: 0 0 158 36
  return (
    <Svg viewBox="0 0 158 36" width={width} height={height}>
      <Path d="M28.7257 0H23.9381V14.9995H4.63563V0H0V13.3159L5.0156 17.2953L0 21.3513V35.0498H4.63563V19.6677H23.9381V35.0498H28.7257V0Z" fill="white" />
      <Rect x="36.3518" y="0" width="4.55964" height="35.0498" fill="white" />
      <Path d="M83.878 34.9729V12.2441L79.0144 20.8918V34.9729H83.878Z" fill="white" />
      <Path d="M83.8747 0.078125V2.14438L67.536 30.5362H64.7242L53.3251 10.9451V35.0514H48.5375V0.078125H52.5652L66.2441 23.8018L79.923 0.078125H83.8747Z" fill="white" />
      <Rect x="91.5039" y="0" width="24.1661" height="4.59167" fill="white" />
      <Rect x="91.5039" y="15" width="24.1661" height="4.59167" fill="white" />
      <Rect x="91.5039" y="30.459" width="24.1661" height="4.59167" fill="white" />
      <Circle cx="140.648" cy="17.582" r="14.95" stroke="white" strokeWidth={5.03319} fill="none" />
    </Svg>
  );
}

function BadgeListComponent({ element }: { element: { props: Record<string, unknown> } }) {
  const p = element.props;
  const items = (p.items as string[]) ?? [];
  const bgColor = (p.bgColor as string) ?? '#9bcaff';
  const textColor = (p.textColor as string) ?? '#010557';
  const fontSize = (p.fontSize as number) ?? 7;

  if (items.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            backgroundColor: bgColor,
            borderRadius: 3,
            paddingHorizontal: 6,
            paddingVertical: 2.5,
          }}
        >
          <Text
            style={{
              fontSize,
              color: textColor,
              fontFamily: 'Helvetica-Bold',
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const fixedComponents: RenderComponentRegistry = {
  BadgeList: BadgeListComponent,
  FixedView: FixedViewComponent,
  FixedRow: FixedRowComponent,
  FixedColumn: FixedColumnComponent,
  FixedText: FixedTextComponent,
  FixedImage: FixedImageComponent,
  FixedDivider: FixedDividerComponent,
  FixedSpacer: FixedSpacerComponent,
  HimeoLogo: HimeoLogoComponent,
  RichText: RichTextComponent,
};
