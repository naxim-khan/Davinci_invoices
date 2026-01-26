import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import type { Invoice } from '../../types/invoice';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Template component type
type TemplateComponent = ComponentType<{ invoice: Invoice }>;

// Fallback template - used when template ID doesn't match any existing template
const TemplateDefault: TemplateComponent = lazy(() => 
    import('./templates/FallbackTemplate').then(m => ({ default: m.FallbackTemplate }))
) as TemplateComponent;

interface TemplateSelectorProps {
    invoice: Invoice;
}

/**
 * Dynamic Template Selector
 * Automatically loads templates based on invoice.invoiceTemplate field
 * 
 * How it works:
 * - Template files must be named: Template1.tsx, Template2.tsx, Template3.tsx, etc.
 * - Each template file exports a named component: export function Template1/2/3() { ... }
 * - If invoice.invoiceTemplate = 1, it loads Template1
 * - If invoice.invoiceTemplate = 2, it loads Template2
 * - If template doesn't exist, fallback template is used automatically
 * 
 * Adding new templates is easy:
 * 1. Create file: src/components/invoice/templates/Template4.tsx
 * 2. Export the component: export function Template4({ invoice }: TemplateProps) { ... }
 * 3. That's it! The selector will automatically find and use it.
 */
export function InvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
    const templateId = invoice.invoiceTemplate?.toString().trim() || '';
    
    // Memoize the lazy component to maintain proper typing and avoid recreating on every render
    const SelectedTemplate = useMemo((): TemplateComponent => {
        if (!templateId) {
            return TemplateDefault;
        }

        return lazy(() =>
            import(`./templates/Template${templateId}.tsx`).then(m => {
                // Get the exported component which should be named Template{id}
                const Template = m[`Template${templateId}`];
                return { default: Template };
            }).catch(() => {
                // If template doesn't exist, return the default template
                return import('./templates/FallbackTemplate').then(m => ({ 
                    default: m.FallbackTemplate 
                }));
            })
        ) as TemplateComponent;
    }, [templateId]);

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <SelectedTemplate invoice={invoice} />
        </Suspense>
    );
}
