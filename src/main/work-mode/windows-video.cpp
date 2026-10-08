// MIT. Windows Media Foundation owns decoding; no downloaded codecs or repository code.
#include <windows.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <wincodec.h>
#include <wrl/client.h>
#include <propvarutil.h>
#include <iostream>
#include <vector>
#include <stdexcept>
#include <cmath>
using Microsoft::WRL::ComPtr;
static const char* stage="initialize";
static void checked(HRESULT value) { if (FAILED(value)) throw value; }
static void png(const wchar_t* file, IMFSample* sample, UINT32 width, UINT32 height, LONG fallbackStride, UINT32 decodedHeight) {
  stage="frame-buffer";
  ComPtr<IMFMediaBuffer> media; checked(sample->ConvertToContiguousBuffer(&media));
  BYTE* data=nullptr; DWORD capacity=0, length=0; LONG stride=fallbackStride;
  ComPtr<IMF2DBuffer> twoDimensional; const bool twoD=SUCCEEDED(media.As(&twoDimensional));
  if(twoD)checked(twoDimensional->Lock2D(&data,&stride));else checked(media->Lock(&data,&capacity,&length));
  std::vector<BYTE> pixels;
  try {
    if (abs(stride)<LONG(width*4)||abs(stride)>3840*4||(!twoD&&length<abs(stride)*decodedHeight)) throw E_FAIL;
    if(!twoD&&stride<0)data+=size_t(abs(stride))*(decodedHeight-1);
    pixels.resize(width*height*3);
    for (UINT32 y=0;y<height;y++)for(UINT32 x=0;x<width;x++){
      const BYTE* source=data+ptrdiff_t(y)*stride+x*4; const size_t pixel=size_t(y)*width+x;
      pixels[pixel*3]=source[0]; pixels[pixel*3+1]=source[1]; pixels[pixel*3+2]=source[2];
    }
  } catch (...) { if(twoD)twoDimensional->Unlock2D();else media->Unlock(); throw; }
  checked(twoD?twoDimensional->Unlock2D():media->Unlock());
  stage="png-create";
  ComPtr<IWICImagingFactory> factory; checked(CoCreateInstance(CLSID_WICImagingFactory,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&factory)));
  ComPtr<IWICStream> stream; checked(factory->CreateStream(&stream)); checked(stream->InitializeFromFilename(file,GENERIC_WRITE));
  ComPtr<IWICBitmapEncoder> encoder; checked(factory->CreateEncoder(GUID_ContainerFormatPng,nullptr,&encoder)); checked(encoder->Initialize(stream.Get(),WICBitmapEncoderNoCache));
  ComPtr<IWICBitmapFrameEncode> frame; checked(encoder->CreateNewFrame(&frame,nullptr)); checked(frame->Initialize(nullptr)); checked(frame->SetSize(width,height));
  stage="png-format";
  WICPixelFormatGUID format=GUID_WICPixelFormat24bppBGR; checked(frame->SetPixelFormat(&format));
  if (format!=GUID_WICPixelFormat24bppBGR) throw E_FAIL;
  stage="png-write";
  checked(frame->WritePixels(height,width*3,UINT(pixels.size()),pixels.data())); checked(frame->Commit()); checked(encoder->Commit());
}
int wmain(int argc,wchar_t** argv) {
  if (argc!=2&&argc!=4) return 2;
  HRESULT initialized=CoInitializeEx(nullptr,COINIT_MULTITHREADED); if (FAILED(initialized)) return 3;
  HANDLE job=CreateJobObjectW(nullptr,nullptr);
  JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
  limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_PROCESS_MEMORY|JOB_OBJECT_LIMIT_ACTIVE_PROCESS|JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
  limits.ProcessMemoryLimit=384ull*1024*1024; limits.BasicLimitInformation.ActiveProcessLimit=1;
  if (!job||!SetInformationJobObject(job,JobObjectExtendedLimitInformation,&limits,sizeof(limits))||!AssignProcessToJobObject(job,GetCurrentProcess())) return 4;
  int result=0;
  try {
    checked(MFStartup(MF_VERSION,MFSTARTUP_FULL));
    {
      ComPtr<IMFAttributes> options; checked(MFCreateAttributes(&options,3));
      checked(options->SetUINT32(MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING,TRUE));
      checked(options->SetUINT32(MF_READWRITE_ENABLE_HARDWARE_TRANSFORMS,FALSE));
      ComPtr<IMFSourceReader> reader; checked(MFCreateSourceReaderFromURL(argv[1],options.Get(),&reader));
      checked(reader->SetStreamSelection(MF_SOURCE_READER_ALL_STREAMS,FALSE)); checked(reader->SetStreamSelection(MF_SOURCE_READER_FIRST_VIDEO_STREAM,TRUE));
      ComPtr<IMFMediaType> type; checked(reader->GetNativeMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,&type));
      UINT32 width=0,height=0,num=0,den=0,rotation=0;
      GUID nativeSubtype{}; checked(type->GetGUID(MF_MT_SUBTYPE,&nativeSubtype));
      if(nativeSubtype!=MFVideoFormat_H264) throw E_INVALIDARG;
      checked(MFGetAttributeSize(type.Get(),MF_MT_FRAME_SIZE,&width,&height));
      checked(MFGetAttributeRatio(type.Get(),MF_MT_FRAME_RATE,&num,&den));
      type->GetUINT32(MF_MT_VIDEO_ROTATION,&rotation);
      if (!width||!height||width>3840||height>2160||!num||!den||rotation!=0) throw E_INVALIDARG;
      PROPVARIANT duration{}; checked(reader->GetPresentationAttribute(MF_SOURCE_READER_MEDIASOURCE,MF_PD_DURATION,&duration));
      if (duration.vt!=VT_UI8||duration.uhVal.QuadPart==0||duration.uhVal.QuadPart>3600ull*10000000) throw E_INVALIDARG;
      const auto ticks=duration.uhVal.QuadPart; PropVariantClear(&duration);
      LONGLONG actual=-1;
      {
        wchar_t* end=nullptr; const auto requested=argc==4?_wcstoi64(argv[3],&end,10):0;
        if ((argc==4&&(!end||*end))||requested<0||ULONGLONG(requested)>=ticks) throw E_INVALIDARG;
        ComPtr<IMFMediaType> output; checked(MFCreateMediaType(&output));
        checked(output->SetGUID(MF_MT_MAJOR_TYPE,MFMediaType_Video)); checked(output->SetGUID(MF_MT_SUBTYPE,MFVideoFormat_RGB32));
        stage="output-type";
        checked(reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,nullptr,output.Get()));
        PROPVARIANT seek{}; seek.vt=VT_I8; seek.hVal.QuadPart=requested; checked(reader->SetCurrentPosition(GUID_NULL,seek));
        LONG stride=LONG(width*4); UINT32 decodedHeight=height;
        for (unsigned count=0;count<10000;count++) {
          DWORD stream=0,flags=0; LONGLONG timestamp=0; ComPtr<IMFSample> sample;
          stage="read-sample";
          checked(reader->ReadSample(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,&stream,&flags,&timestamp,&sample));
          if (flags&MF_SOURCE_READERF_ENDOFSTREAM) throw MF_E_END_OF_STREAM;
          if (flags&MF_SOURCE_READERF_CURRENTMEDIATYPECHANGED) {
            ComPtr<IMFMediaType> current; checked(reader->GetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,&current));
            UINT32 currentWidth=0,currentHeight=0; GUID currentSubtype{};
            checked(MFGetAttributeSize(current.Get(),MF_MT_FRAME_SIZE,&currentWidth,&currentHeight)); checked(current->GetGUID(MF_MT_SUBTYPE,&currentSubtype));
            stage="video-shape";
            if(currentWidth<width||currentWidth>width+32||currentHeight<height||currentHeight>height+32||currentSubtype!=MFVideoFormat_RGB32) throw E_FAIL;
            decodedHeight=currentHeight;UINT32 rawStride=currentWidth*4;current->GetUINT32(MF_MT_DEFAULT_STRIDE,&rawStride);stride=LONG(rawStride);
          }
          if (sample&&timestamp>=requested) { actual=timestamp; if(argc==4)png(argv[2],sample.Get(),width,height,stride,decodedHeight); break; }
        }
        if (actual<0) throw E_FAIL;
      }
      std::cout<<"{\"protocol\":1,\"durationTicks\":"<<ticks<<",\"width\":"<<width<<",\"height\":"<<height<<",\"fpsNumerator\":"<<num<<",\"fpsDenominator\":"<<den<<",\"actualTicks\":"<<actual<<"}";
    }
    MFShutdown();
  } catch (HRESULT error) { std::cerr<<"VIDEO_DECODE_FAILED "<<stage<<" "<<std::hex<<error; result=5; }
  catch (...) { std::cerr<<"VIDEO_DECODE_FAILED"; result=6; }
  // The job handle is intentionally held until process exit. Closing it here
  // would terminate this very process before its output/exit code is observed.
  CoUninitialize(); return result;
}
