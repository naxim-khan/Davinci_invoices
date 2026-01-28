import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import type { ConsolidatedInvoice } from '../../types/consolidated-invoice';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Template component type
type TemplateComponent = ComponentType<{ invoice: ConsolidatedInvoice }>;

// Fallback template
const TemplateDefault: TemplateComponent = lazy(() =>
    import('./consolidated-templates/Template1').then(m => ({ default: m.Template1 }))
) as TemplateComponent;

interface TemplateSelectorProps {
    invoice: ConsolidatedInvoice;
}

/**
 * Consolidated Invoice Template Selector
 */
export function ConsolidatedInvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
    // In future, this would come from a database field. 
    // For now we default to Template1 and support override from URL if needed.
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const templateId = (invoice as any).invoiceTemplate || urlParams.get('template') || '1';

    const SelectedTemplate = useMemo((): TemplateComponent => {
        if (!templateId || templateId === '1') {
            return TemplateDefault;
        }

        return lazy(() =>
            import(`./consolidated-templates/Template${templateId}.tsx`).then(m => {
                const Template = m[`Template${templateId}`];
                return { default: Template };
            }).catch(() => {
                // Fallback to Template1
                return import('./consolidated-templates/Template1').then(m => ({
                    default: m.Template1
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
