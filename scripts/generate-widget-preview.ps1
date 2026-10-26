Add-Type -AssemblyName System.Drawing
$widgetPreviewRoot = Split-Path -Parent $PSScriptRoot
$widgetPreviewDirectory = Join-Path $widgetPreviewRoot 'assets/widget-preview'
New-Item -ItemType Directory -Path $widgetPreviewDirectory -Force | Out-Null
$widgetPreviewBitmap = [System.Drawing.Bitmap]::new(600, 280)
$widgetPreviewGraphics = [System.Drawing.Graphics]::FromImage($widgetPreviewBitmap)
$widgetPreviewGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$widgetPreviewGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
function Draw-WidgetRoundRect($x, $y, $width, $height, $radius, $hex) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
  $widgetPreviewGraphics.FillPath($brush, $path)
  $brush.Dispose(); $path.Dispose()
}
function Draw-WidgetText($text, $x, $y, $size, $hex, $bold = $false) {
  $weight = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = [System.Drawing.Font]::new('Segoe UI', $size, $weight, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
  $widgetPreviewGraphics.DrawString($text, $font, $brush, [float]$x, [float]$y)
  $font.Dispose(); $brush.Dispose()
}
Draw-WidgetRoundRect 0 0 600 280 46 '#FFFFFF'
Draw-WidgetRoundRect 14 14 260 252 34 '#F6F3F1'
Draw-WidgetText 'PHOTO' 108 126 20 '#8A828C'
Draw-WidgetText 'Your person' 306 37 31 '#241E2C' $true
Draw-WidgetText 'Studying' 306 98 26 '#241E2C'
Draw-WidgetText '12 minutes ago' 306 151 18 '#8A828C'
Draw-WidgetRoundRect 298 194 284 70 30 '#7251DB'
Draw-WidgetText 'Nudge' 402 210 26 '#FFFFFF'
$widgetPreviewBitmap.Save((Join-Path $widgetPreviewDirectory 'wyd-moment.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$widgetPreviewGraphics.Dispose(); $widgetPreviewBitmap.Dispose()
