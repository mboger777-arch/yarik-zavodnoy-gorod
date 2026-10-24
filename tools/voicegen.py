# Qwen3-TTS клон голосов (референсы из прошлых игр, без эффектов), ASR-проверка (faster-whisper) и до 4 дублей. Возобновляемо.
import json,os,re,subprocess,hashlib,torch,soundfile as sf,sys
import numpy as np
def L(f): return np.frombuffer(subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout,np.float32)
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=R+'/assets/voice';os.makedirs(OUT,exist_ok=True)
RO='/home/box/tts/refs/ostrov';RY='/home/box/tts/refs/yarmarka';RP='/home/box/tts/refs/prost'
TO=json.load(open(RO+'/texts.json'));TY=json.load(open(RY+'/texts.json'));TP=json.load(open(RP+'/texts.json'));RJ=json.load(open('/home/box/tts/refs/refs.json'))
RYJ=json.load(open(RY+'/texts.json'))
REF={"yarik":(f"{RO}/tim_1.wav",TO["tim"]),"popr":(f"{RY}/barsik_1.wav",TY["barsik"]),"ulya":(f"{RO}/mey_1.wav",TO["mey"]),"kav":(f"{RP}/troll_1.wav",TP["troll"]),"narrator":(f"{RY}/narrator_1.wav",TY["narrator"])}
CHAIN=("highpass=f=60,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
 "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
 "afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,adelay=60,apad=pad_dur=0.12")
FIX={'—':',','…':'...','«':'','»':'','°':' градусов','?!':'?'}
def spoken(o):
    t=o.get('s',o['t'])
    for a,b in FIX.items(): t=t.replace(a,b)
    return re.sub(r'\s+',' ',t).strip()
lines=json.load(open(R+'/tools/lines.json'));jobs=[]
for o in lines:
    h=hashlib.sha1(f"g306|{o['who']}|{spoken(o)}".encode()).hexdigest()[:8];o['file']=f"{o['k']}_{h}.mp3"
    if not os.path.exists(f"{OUT}/{o['file']}"): jobs.append(o)
print('jobs',len(jobs),flush=True)
def man():
    m={}
    for o in lines:
        f=f"{OUT}/{o['file']}"
        if os.path.exists(f): m[o['k']]=[o['file'],round(float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f])),2)]
    open(R+'/js/voice.js','w').write('const VOICE='+json.dumps(m,ensure_ascii=False)+';\n');print('manifest',len(m),flush=True)
def norm(s): s=s.replace('\u0301','').lower().replace('ё','е');return re.sub(r'[^а-я0-9 ]',' ',s).split()
def wer(a,b):
    D=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        P=D[:];D[0]=i
        for j,y in enumerate(b,1): D[j]=min(P[j]+1,D[j-1]+1,P[j-1]+(x!=y))
    return D[-1]/max(1,len(a))
NUMW=set('ноль нуля нулю один одна одной одну два две двух трём три трех четыре четырёх пять пяти шесть шести семь семи восемь восьми девять девяти десять десяти одиннадцать двенадцать двенадцати тринадцать четырнадцать пятнадцать пятнадцати двадцать двадцати тридцать тридцати сорок сорока пятьдесят пятидесяти шестьдесят семьдесят восемьдесят восьмидесяти девяносто сто ста двести целых целая целой десятых десятая десятой десятую сотых сотая сотой сотую'.replace('ё','е').split())
def nums(s): return [x.replace('.',',') for x in re.findall(r'\d+(?:[.,]\d+)?',s)]
def numwer(orig,t,hyp):
    # Whisper пишет числа цифрами: сравниваем слова без числительных + сами числа с исходным текстом (цифры)
    a=[w for w in norm(t) if w not in NUMW];b=[w for w in norm(hyp) if w not in NUMW and not w.isdigit()]
    return wer(a,b)+(0 if nums(orig)==nums(hyp) else 0.5)
if jobs:
    from qwen_tts import Qwen3TTSModel
    from faster_whisper import WhisperModel
    torch.set_num_threads(int(os.environ.get('NT','6')))
    A=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2)
    M=Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-Base',device_map='cpu',dtype=torch.float32)
    P={}
    log=open(R+'/tools/voice_asr.jsonl','a')
    for i,o in enumerate(jobs):
        w=o['who']
        if w not in P: P[w]=M.create_voice_clone_prompt(ref_audio=REF[w][0],ref_text=REF[w][1],x_vector_only_mode=False)
        t=spoken(o);best=None
        for take in range(int(os.environ.get('TAKES','4'))):
            torch.manual_seed(int(os.environ.get('SEED','2000'))+i*7+take)
            wv,sr=M.generate_voice_clone(text=t,language='Russian',voice_clone_prompt=P[w],non_streaming_mode=True,temperature=0.6 if take==0 else 0.5,max_new_tokens=max(80,int(len(t)*1.8)+40))
            raw=f'/tmp/kv_{take}.wav';sf.write(raw,wv[0],sr);fin=f'/tmp/kv_{take}.mp3'
            subprocess.run(['ffmpeg','-y','-loglevel','error','-i',raw,'-af',CHAIN,'-ac','1','-ar','24000','-b:a','64k',fin],check=True)
            hyp=' '.join(s.text for s in A.transcribe(L(fin),language='ru',beam_size=3)[0])
            e=min(wer(norm(t),norm(hyp)),numwer(o['t'],t,hyp))
            if best is None or e<best[0]: best=(e,fin,hyp)
            if e<=float(os.environ.get('THR','0.08')): break
        os.replace(best[1],f"{OUT}/{o['file']}")
        log.write(json.dumps({'k':o['k'],'wer':round(best[0],3),'say':t,'hyp':best[2]},ensure_ascii=False)+'\n');log.flush()
        print(i,o['k'],round(best[0],3),best[2],flush=True)
        if i%8==7: man()
man();print('VOICEDONE',flush=True)
