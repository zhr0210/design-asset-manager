/* MIT, DAM owned-child physical memory probe. No process enumeration. */
#include <libproc.h>
#include <sys/resource.h>
#include <stdio.h>
#include <stdlib.h>
int main(int argc, char **argv) {
  if (argc != 2) return 2;
  char *end; long pid = strtol(argv[1], &end, 10);
  if (*end || pid < 1 || pid > 2147483647) return 2;
  struct proc_bsdinfo info = {0}; struct rusage_info_v4 usage = {0};
  if (proc_pidinfo((int)pid, PROC_PIDTBSDINFO, 0, &info, sizeof(info)) != sizeof(info) ||
      proc_pid_rusage((int)pid, RUSAGE_INFO_V4, (rusage_info_t *)&usage)) return 1;
  printf("{\"pid\":%ld,\"created\":%llu,\"current\":%llu,\"peak\":%llu}\n", pid,
    (unsigned long long)info.pbi_start_tvsec * 1000 + info.pbi_start_tvusec / 1000,
    (unsigned long long)usage.ri_phys_footprint, (unsigned long long)usage.ri_lifetime_max_phys_footprint);
  return 0;
}
