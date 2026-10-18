import { Pipe, PipeTransform } from '@angular/core';

/** Display: cumulative trade quantity; 0 stays "0". */
@Pipe({
  name: 'marketVolume',
  standalone: true,
  pure: true,
})
export class MarketVolumePipe implements PipeTransform {
  transform(volume: number | null | undefined): string {
    if (volume === null || volume === undefined) return '0';
    return String(volume);
  }
}
