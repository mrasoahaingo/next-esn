import { View, Text, Image } from '@react-pdf/renderer';
import type { RenderComponentRegistry } from '@json-render/react-pdf/render';

// Custom components with fixed={true} to repeat on every page
function FixedViewComponent({ element, children }: { element: { props: Record<string, unknown> }; children?: React.ReactNode }) {
  const p = element.props;
  return (
    <View
      fixed
      style={{
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

export const fixedComponents: RenderComponentRegistry = {
  FixedView: FixedViewComponent,
  FixedRow: FixedRowComponent,
  FixedColumn: FixedColumnComponent,
  FixedText: FixedTextComponent,
  FixedImage: FixedImageComponent,
  FixedDivider: FixedDividerComponent,
  FixedSpacer: FixedSpacerComponent,
};
