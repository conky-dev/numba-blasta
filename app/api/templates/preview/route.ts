import { NextRequest, NextResponse } from 'next/server';
import { previewTemplate } from '@/lib/template-utils';

/**
 * POST /api/templates/preview
 * Preview a template with sample data (no auth required for preview)
 */
export async function POST(request: NextRequest) {
  try {
    const { content, sampleData } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 422 }
      );
    }

    const preview = previewTemplate(content, sampleData || {});

    return NextResponse.json({
      success: true,
      ...preview,
    });
  } catch (error: any) {
    console.error('Template preview error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to preview template' },
      { status: 500 }
    );
  }
}

