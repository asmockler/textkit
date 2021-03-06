/**
 * A TextRenderer renders text layout objects to a graphics context.
 */
export default ({ Rect }) =>
  class PDFRenderer {
    constructor(ctx, options = {}) {
      this.ctx = ctx;
      this.outlineBlocks = options.outlineBlocks || false;
      this.outlineLines = options.outlineLines || false;
      this.outlineRuns = options.outlineRuns || false;
      this.outlineAttachments = options.outlineAttachments || false;
    }

    render(container) {
      for (const block of container.blocks) {
        this.renderBlock(block);
      }
    }

    renderBlock(block) {
      if (this.outlineBlocks) {
        const { minX, minY, width, height } = block.bbox;
        this.ctx.rect(minX, minY, width, height).stroke();
      }

      for (const line of block.lines) {
        this.renderLine(line);
      }
    }

    renderLine(line) {
      if (this.outlineLines) {
        this.ctx.rect(line.rect.x, line.rect.y, line.rect.width, line.rect.height).stroke();
      }

      this.ctx.save();
      this.ctx.translate(line.rect.x, line.rect.y + line.ascent);

      for (const run of line.glyphRuns) {
        if (run.attributes.backgroundColor) {
          const backgroundRect = new Rect(0, -line.ascent, run.advanceWidth, line.rect.height);
          this.renderBackground(backgroundRect, run.attributes.backgroundColor);
        }

        this.renderRun(run);
      }

      this.ctx.restore();
      this.ctx.save();
      this.ctx.translate(line.rect.x, line.rect.y);

      for (const decorationLine of line.decorationLines) {
        this.renderDecorationLine(decorationLine);
      }

      this.ctx.restore();
    }

    renderRun(run) {
      const { font, fontSize, color, link } = run.attributes;

      if (this.outlineRuns) {
        this.ctx.rect(0, 0, run.advanceWidth, run.height).stroke();
      }

      this.ctx.fillColor(color);

      if (link) {
        this.ctx.link(0, -run.height - run.descent, run.advanceWidth, run.height, link);
      }

      this.renderAttachments(run);

      if (font.sbix || (font.COLR && font.CPAL)) {
        this.ctx.save();
        this.ctx.translate(0, -run.ascent);

        for (let i = 0; i < run.glyphs.length; i++) {
          const position = run.positions[i];
          const glyph = run.glyphs[i];

          this.ctx.save();
          this.ctx.translate(position.xOffset, position.yOffset);

          glyph.render(this.ctx, fontSize);

          this.ctx.restore();
          this.ctx.translate(position.xAdvance, position.yAdvance);
        }

        this.ctx.restore();
      } else {
        this.ctx.font(typeof font.name === 'string' ? font.name : font, fontSize);
        this.ctx._addGlyphs(run.glyphs, run.positions, 0, 0);
      }

      this.ctx.translate(run.advanceWidth, 0);
    }

    renderBackground(rect, backgroundColor) {
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
      this.ctx.fill(backgroundColor);
    }

    renderAttachments(run) {
      this.ctx.save();

      const { font } = run.attributes;
      const space = font.glyphForCodePoint(0x20);
      const objectReplacement = font.glyphForCodePoint(0xfffc);

      for (let i = 0; i < run.glyphs.length; i++) {
        const position = run.positions[i];
        const glyph = run.glyphs[i];

        this.ctx.translate(position.xAdvance, position.yOffset);

        if (glyph === objectReplacement && run.attributes.attachment) {
          this.renderAttachment(run.attributes.attachment);
          run.glyphs[i] = space;
        }
      }

      this.ctx.restore();
    }

    renderAttachment(attachment) {
      const { xOffset = 0, yOffset = 0 } = attachment;

      this.ctx.translate(-attachment.width + xOffset, -attachment.height + yOffset);

      if (this.outlineAttachments) {
        this.ctx.rect(0, 0, attachment.width, attachment.height).stroke();
      }

      if (typeof attachment.render === 'function') {
        this.ctx.rect(0, 0, attachment.width, attachment.height);
        this.ctx.clip();
        attachment.render(this.ctx);
      } else if (attachment.image) {
        this.ctx.image(attachment.image, 0, 0, {
          fit: [attachment.width, attachment.height],
          align: 'center',
          valign: 'bottom'
        });
      }
    }

    renderDecorationLine(line) {
      this.ctx.lineWidth(line.rect.height);

      if (/dashed/.test(line.style)) {
        this.ctx.dash(3 * line.rect.height);
      } else if (/dotted/.test(line.style)) {
        this.ctx.dash(line.rect.height);
      }

      if (/wavy/.test(line.style)) {
        const dist = Math.max(2, line.rect.height);
        let step = 1.1 * dist;
        const stepCount = Math.floor(line.rect.width / (2 * step));

        // Adjust step to fill entire width
        const remainingWidth = line.rect.width - stepCount * 2 * step;
        const adjustment = remainingWidth / stepCount / 2;
        step += adjustment;

        const cp1y = line.rect.y + dist;
        const cp2y = line.rect.y - dist;
        let { x } = line.rect;

        this.ctx.moveTo(line.rect.x, line.rect.y);

        for (let i = 0; i < stepCount; i++) {
          this.ctx.bezierCurveTo(x + step, cp1y, x + step, cp2y, x + 2 * step, line.rect.y);
          x += 2 * step;
        }
      } else {
        this.ctx.moveTo(line.rect.x, line.rect.y);
        this.ctx.lineTo(line.rect.maxX, line.rect.y);

        if (/double/.test(line.style)) {
          this.ctx.moveTo(line.rect.x, line.rect.y + line.rect.height * 2);
          this.ctx.lineTo(line.rect.maxX, line.rect.y + line.rect.height * 2);
        }
      }

      this.ctx.stroke(line.color);
    }
  };
