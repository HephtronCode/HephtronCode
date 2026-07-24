import os
import requests
import json
from datetime import datetime, timedelta

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')

def fetch_wakatime_stats(api_key):
    headers = {'Authorization': f'Bearer {api_key}'}
    
    # Get last 7 days
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    # Get summaries
    url = f'https://wakatime.com/api/v1/users/current/summaries?start={start_date}&end={end_date}'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def fetch_wakatime_languages(api_key):
    headers = {'Authorization': f'Bearer {api_key}'}
    url = 'https://wakatime.com/api/v1/users/current/stats/languages'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def fetch_wakatime_editors(api_key):
    headers = {'Authorization': f'Bearer {api_key}'}
    url = 'https://wakatime.com/api/v1/users/current/stats/editors'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def fetch_wakatime_os(api_key):
    headers = {'Authorization': f'Bearer {api_key}'}
    url = 'https://wakatime.com/api/v1/users/current/stats/operating_systems'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"

def generate_wakatime_svg(data):
    summaries = data.get('data', [])
    total_seconds = sum(s.get('grand_total', {}).get('total_seconds', 0) for s in summaries)
    avg_per_day = total_seconds / max(len(summaries), 1)
    
    days = []
    for s in summaries:
        date = s.get('range', {}).get('date', '')
        secs = s.get('grand_total', {}).get('total_seconds', 0)
        days.append({'date': date, 'seconds': secs, 'text': format_time(secs)})
    
    # Generate daily bars
    max_seconds = max(d['seconds'] for d in days) if days else 1
    bar_height = 30
    bar_width_max = 280
    padding = 20
    label_width = 80
    height = padding * 2 + len(days) * (bar_height + 8) + 60
    
    bars = []
    for i, day in enumerate(reversed(days)):
        y = padding + 50 + i * (bar_height + 8)
        width = (day['seconds'] / max_seconds) * bar_width_max
        bars.append(f'''
      <rect x="{padding + label_width}" y="{y}" width="{width}" height="{bar_height}" rx="4" fill="#00f2fe" opacity="0.8"/>
      <text x="{padding + label_width + width + 8}" y="{y + 20}" class="time-text">{day['text']}</text>
      <text x="{padding}" y="{y + 20}" class="day-label">{day['date']}</text>
    ''')
    
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="450" height="{height}" viewBox="0 0 450 {height}">
  <style>
    .bg {{ fill: #0d1117; }}
    .border {{ fill: none; stroke: #30363d; stroke-width: 1; }}
    .title {{ fill: #00f2fe; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 14px; font-weight: 600; }}
    .subtitle {{ fill: #8b949e; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; }}
    .day-label {{ fill: #8b949e; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; text-anchor: end; }}
    .time-text {{ fill: #e6edf3; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; font-weight: 600; }}
    .stat-label {{ fill: #8b949e; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; }}
    .stat-value {{ fill: #e6edf3; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 18px; font-weight: 700; }}
  </style>
  <rect class="bg" x="0" y="0" width="450" height="{height}" rx="10" ry="10"/>
  <rect class="border" x="0.5" y="0.5" width="449" height="{height - 1}" rx="9.5" ry="9.5"/>
  
  <text class="title" x="20" y="30">WakaTime - Last 7 Days</text>
  <text class="subtitle" x="20" y="48">Total: {format_time(total_seconds)} • Daily Avg: {format_time(avg_per_day)}</text>
  
  {''.join(bars)}
</svg>'''

def generate_lang_svg(data):
    languages = data.get('data', [])[:8]
    if not languages:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text>No language data</text></svg>'
    
    bar_height = 14
    padding = 20
    label_width = 100
    bar_max_width = 250
    height = padding * 2 + len(languages) * (bar_height + 6) + 40
    
    bars = []
    for i, lang in enumerate(languages):
        y = padding + 40 + i * (bar_height + 6)
        width = (lang.get('percent', 0) / 100) * bar_max_width
        color = lang.get('color', '#8b949e')
        bars.append(f'''
      <text x="{padding}" y="{y + 10}" class="lang-label">{lang.get('name', '')}</text>
      <rect x="{padding + label_width}" y="{y}" width="{width}" height="{bar_height}" rx="3" fill="{color}"/>
      <text x="{padding + label_width + width + 8}" y="{y + 10}" class="lang-pct">{lang.get('percent', 0):.1f}%</text>
    ''')
    
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="420" height="{height}" viewBox="0 0 420 {height}">
  <style>
    .bg {{ fill: #0d1117; }}
    .border {{ fill: none; stroke: #30363d; stroke-width: 1; }}
    .title {{ fill: #00f2fe; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 14px; font-weight: 600; }}
    .lang-label {{ fill: #8b949e; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; text-anchor: end; }}
    .lang-pct {{ fill: #e6edf3; font-family: 'Segoe UI', Ubuntu, sans-serif; font-size: 11px; font-weight: 600; }}
  </style>
  <rect class="bg" x="0" y="0" width="420" height="{height}" rx="10" ry="10"/>
  <rect class="border" x="0.5" y="0.5" width="419" height="{height - 1}" rx="9.5" ry="9.5"/>
  <text class="title" x="20" y="28">Top Languages (All Time)</text>
  {''.join(bars)}
</svg>'''

def main():
    api_key = os.environ.get('WAKATIME_API_KEY')
    if not api_key:
        print('WAKATIME_API_KEY not set, skipping...')
        return
    
    try:
        print('Fetching WakaTime stats...')
        stats = fetch_wakatime_stats(api_key)
        langs = fetch_wakatime_languages(api_key)
        
        print('Generating SVGs...')
        wakatime_svg = generate_wakatime_svg(stats)
        lang_svg = generate_lang_svg(langs)
        
        os.makedirs(ASSETS_DIR, exist_ok=True)
        with open(os.path.join(ASSETS_DIR, 'wakatime-weekly.svg'), 'w') as f:
            f.write(wakatime_svg)
        with open(os.path.join(ASSETS_DIR, 'wakatime-languages.svg'), 'w') as f:
            f.write(lang_svg)
        
        print('WakaTime SVGs generated successfully!')
    except Exception as e:
        print(f'Error: {e}')
        exit(1)

if __name__ == '__main__':
    main()