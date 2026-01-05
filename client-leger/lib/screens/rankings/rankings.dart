import 'dart:async';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/models/leaderboard_user.dart';
import 'package:client_leger/widgets/leaderboard/leaderboard_cell.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/services/friends/friends-service.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';

class RankingsPage extends StatefulWidget {
  const RankingsPage({super.key});

  @override
  State<RankingsPage> createState() => _RankingsPageState();
}

class _RankingsPageState extends State<RankingsPage> {
  List<LeaderboardUser> _users = const [];
  bool _loading = true;
  String? _error;
  String? _selfUid;
  final FriendService _friendService = FriendService();
  Set<String> _blockedByMe = <String>{};
  Set<String> _blockedMe = <String>{};
  final Map<String, bool> _onlineStatuses = <String, bool>{};
  void Function(dynamic)? _onBlockedUsers;
  void Function(dynamic)? _onUsersWhoBlockedMe;
  void Function(dynamic)? _onUserBlocked;
  void Function(dynamic)? _onUserUnblocked;
  void Function(dynamic)? _onBlockedByUser;

  void Function(dynamic)? _onUsers;
  void Function(dynamic)? _onStats;
  void Function(dynamic)? _onError;
  void Function(dynamic)? _onConnect;
  void Function(dynamic)? _onOnlineFriends;
  void Function(dynamic)? _onUserConnected;
  void Function(dynamic)? _onUserDisconnected;

  bool _requestedStats = false;
  String _sortColumn = 'lifetimeEarnings';
  bool _sortAsc = false; // default desc
  String _rankBaseColumn =
      'lifetimeEarnings'; // column used to assign rank values
  Map<String, int> _originalOrder = {};
  bool _avatarsPrefetched = false;

  @override
  void initState() {
    super.initState();
    _init();
    // Cache the current user's UID for row highlighting
    _selfUid = FirebaseAuth.instance.currentUser?.uid;
  }

  Future<void> _init() async {
    setState(() {
      _loading = true;
      _error = null;
      _requestedStats = false;
    });

    try {
      await SocketService.I.connect();

      // Bind presence listeners (same as friends tab) so server events are active.
      _friendService.bindPresenceListeners();

      _initBlockTracking();

      _onUsers = (data) {
        try {
          final users = _parseUsers(data);
          final blockedMe = _extractBlockedMeUids(data);
          final iBlocked = _extractBlockedByMeUids(data);
          setState(() {
            _users = users;
            _originalOrder = {
              for (int i = 0; i < users.length; i++) users[i].uid: i,
            };
            if (blockedMe.isNotEmpty) {
              _blockedMe = blockedMe;
            }
            if (iBlocked.isNotEmpty) {
              _blockedByMe = iBlocked;
            }
          });
          // Immediately refresh online statuses for friends appearing in ranking list.
          _friendService.getOnlineFriends();
          // Prefetch avatars once users have loaded
          if (!_avatarsPrefetched) {
            _avatarsPrefetched = true;
            // Give the UI a tick, then prefetch in background
            scheduleMicrotask(_prefetchAvatars);
          }
          if (!_requestedStats) {
            _requestedStats = true;
            SocketService.I.emit('getAllUserStatistics');
          }
        } catch (e) {
          setState(() {
            _error = 'LEADERBOARDS_PAGE.LOADING'.tr();
            _loading = false;
          });
        }
      };
      SocketService.I.on('everyUser', _onUsers!);

      _onStats = (data) {
        try {
          final statsList = _parseStats(data);
          final byUid = {for (final s in statsList) s.uid: s};
          setState(() {
            _users = _users.map((u) {
              final s = byUid[u.uid];
              if (s == null) return u.copyWithComputed(null);
              return u.copyWithComputed(s);
            }).toList();
            _recomputeRanksForColumn(_rankBaseColumn);
            _sortUsers();
            _loading = false;
            _error = null;
          });
        } catch (e) {
          setState(() {
            _loading = false;
            _error = 'LEADERBOARDS_PAGE.LOADING'.tr();
          });
        }
      };
      SocketService.I.on('AllUserStatistics', _onStats!);

      _onError = (data) {
        final msg = data?.toString().toLowerCase() ?? '';
        if (msg.contains('auth') || msg.contains('utilisateur')) {
          Future.delayed(const Duration(milliseconds: 200), () {
            if (_users.isEmpty) {
              SocketService.I.emit('getEveryUser');
            } else {
              SocketService.I.emit('getAllUserStatistics');
            }
          });
        }
      };
      SocketService.I.on('errorMessage', _onError!);

      _onConnect = (_) {
        _friendService.getBlockedUsers();
        Future.delayed(const Duration(milliseconds: 10), () {
          SocketService.I.emit('getEveryUser');
        });
        _friendService.getOnlineFriends();
      };
      SocketService.I.on('connect', _onConnect!);

      _onOnlineFriends = (data) {
        try {
          if (data is Map) {
            final map = Map<String, dynamic>.from(data);
            setState(() {
              map.forEach((k, v) {
                _onlineStatuses[k] = v == true;
              });
            });
          }
        } catch (_) {}
      };
      SocketService.I.on('onlineFriends', _onOnlineFriends!);

      _onUserConnected = (data) {
        final uid = _extractUid(data);
        if (uid != null && uid.isNotEmpty) {
          setState(() => _onlineStatuses[uid] = true);
        }
      };
      SocketService.I.on('userConnected', _onUserConnected!);

      _onUserDisconnected = (data) {
        final uid = _extractUid(data);
        if (uid != null && uid.isNotEmpty) {
          setState(() => _onlineStatuses[uid] = false);
        }
      };
      SocketService.I.on('userDisconnected', _onUserDisconnected!);

      Future.delayed(const Duration(milliseconds: 200), () {
        SocketService.I.emit('getEveryUser');
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'LEADERBOARDS_PAGE.LOADING'.tr();
      });
    }
  }

  void _initBlockTracking() {
    _onBlockedUsers = (data) {
      if (!mounted) return;
      try {
        final list = (data as List)
            .map((e) => (e is Map ? Map<String, dynamic>.from(e) : const {}))
            .where((m) => m.isNotEmpty)
            .toList();
        setState(() {
          _blockedByMe = list
              .map((m) => (m['uid'] ?? '').toString())
              .where((id) => id.isNotEmpty)
              .toSet();
          _users = _users.toList();
        });
      } catch (_) {}
    };
    SocketService.I.on('blockedUsers', _onBlockedUsers!);
    try {
      _friendService.getBlockedUsers();
    } catch (_) {}

    _onUsersWhoBlockedMe = (data) {
      if (!mounted) return;
      try {
        final list = (data as List)
            .map((e) => (e is Map ? Map<String, dynamic>.from(e) : const {}))
            .where((m) => m.isNotEmpty)
            .toList();
        setState(() {
          _blockedMe = list
              .map((m) => (m['uid'] ?? '').toString())
              .where((id) => id.isNotEmpty)
              .toSet();
        });
      } catch (_) {}
    };
    SocketService.I.on('usersWhoBlockedMe', _onUsersWhoBlockedMe!);

    _onUserBlocked = (data) {
      try {
        final uid = (data is Map ? data['blockedUid'] : null)?.toString();
        if (uid != null && uid.isNotEmpty) {
          if (!mounted) return;
          setState(() {
            _blockedByMe = {..._blockedByMe, uid};
            _users = _users.toList();
          });
        }
      } catch (_) {}
      _friendService.getBlockedUsers();
    };
    SocketService.I.on('userBlocked', _onUserBlocked!);
    _onUserUnblocked = (data) {
      try {
        final uid = (data is Map ? data['blockedUid'] : null)?.toString();
        if (uid != null && uid.isNotEmpty) {
          if (!mounted) return;
          setState(() {
            _blockedByMe = {..._blockedByMe}..remove(uid);
            _users = _users.toList();
          });
        }
      } catch (_) {}
      _friendService.getBlockedUsers();
    };
    SocketService.I.on('userUnblocked', _onUserUnblocked!);

    _onBlockedByUser = (data) {
      try {
        final uid = (data is Map ? data['blockerUid'] : null)?.toString();
        if (uid != null && uid.isNotEmpty) {
          if (!mounted) return;
          setState(() {
            _blockedMe = {..._blockedMe, uid};
          });
        }
      } catch (_) {}
    };
    SocketService.I.on('blockedByUser', _onBlockedByUser!);

    try {
      SocketService.I.emit('getUsersWhoBlockedMe');
    } catch (_) {}
  }

  void _sortUsers([String? column]) {
    if (column != null) {
      if (_sortColumn == column) {
        _sortAsc = !_sortAsc;
        _users = _users.reversed.toList();
        return;
      } else {
        _sortColumn = column;
        _sortAsc = false;
        _rankBaseColumn = column;
        _recomputeRanksForColumn(column);
      }
    }

    int dir = _sortAsc ? 1 : -1; // asc: 1, desc: -1
    _users.sort((a, b) {
      num av;
      num bv;
      switch (_sortColumn) {
        case 'lifetimeEarnings':
          av = (a.lifetimeEarnings ?? 0);
          bv = (b.lifetimeEarnings ?? 0);
          break;
        case 'gamesPlayed':
          av = a.totalGamesPlayed;
          bv = b.totalGamesPlayed;
          break;
        case 'wins':
          av = a.wins;
          bv = b.wins;
          break;
        case 'winRate':
          av = a.winRate;
          bv = b.winRate;
          break;
        case 'duration':
          av = a.totalGameDurationSeconds;
          bv = b.totalGameDurationSeconds;
          break;
        case 'username':
          final an = a.displayName.toLowerCase();
          final bn = b.displayName.toLowerCase();
          final cmp = dir * an.compareTo(bn);
          if (cmp != 0) return cmp;
          final ar = a.rank ?? 1 << 30;
          final br = b.rank ?? 1 << 30;
          final rc = ar.compareTo(br);
          if (rc != 0) return rc;
          return a.uid.compareTo(b.uid);
        default:
          av = 0;
          bv = 0;
      }
      if (av == bv) {
        if (av == 0) {
          final ai = _originalOrder[a.uid] ?? (1 << 30);
          final bi = _originalOrder[b.uid] ?? (1 << 30);
          final oc = ai.compareTo(bi);
          if (oc != 0) return oc;
        }
        final ar = a.rank ?? 1 << 30;
        final br = b.rank ?? 1 << 30;
        final rc = ar.compareTo(br);
        if (rc != 0) return rc;
        return a.displayName.toLowerCase().compareTo(
          b.displayName.toLowerCase(),
        );
      }
      return dir * (av.compareTo(bv));
    });
  }

  void _recomputeRanksForColumn(String column) {
    final snapshot = [..._users];
    snapshot.sort((a, b) {
      int cmp;
      switch (column) {
        case 'lifetimeEarnings':
          cmp = (b.lifetimeEarnings ?? 0).compareTo(a.lifetimeEarnings ?? 0);
          break;
        case 'gamesPlayed':
          cmp = b.totalGamesPlayed.compareTo(a.totalGamesPlayed);
          break;
        case 'wins':
          cmp = b.wins.compareTo(a.wins);
          break;
        case 'winRate':
          cmp = b.winRate.compareTo(a.winRate);
          break;
        case 'duration':
          cmp = b.totalGameDurationSeconds.compareTo(
            a.totalGameDurationSeconds,
          );
          break;
        case 'username':
          cmp = a.displayName.toLowerCase().compareTo(
            b.displayName.toLowerCase(),
          );
          break;
        default:
          cmp = 0;
      }
      if (cmp != 0) return cmp;
      if (column != 'username') {
        num av;
        num bv;
        switch (column) {
          case 'lifetimeEarnings':
            av = (a.lifetimeEarnings ?? 0);
            bv = (b.lifetimeEarnings ?? 0);
            break;
          case 'gamesPlayed':
            av = a.totalGamesPlayed;
            bv = b.totalGamesPlayed;
            break;
          case 'wins':
            av = a.wins;
            bv = b.wins;
            break;
          case 'winRate':
            av = a.winRate;
            bv = b.winRate;
            break;
          case 'duration':
            av = a.totalGameDurationSeconds;
            bv = b.totalGameDurationSeconds;
            break;
          default:
            av = 0;
            bv = 0;
        }
        if (av == 0 && bv == 0) {
          final ai = _originalOrder[a.uid] ?? (1 << 30);
          final bi = _originalOrder[b.uid] ?? (1 << 30);
          final oc = ai.compareTo(bi);
          if (oc != 0) return oc;
        }
      }
      return a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase());
    });
    final rankByUid = <String, int>{};
    for (int i = 0; i < snapshot.length; i++) {
      rankByUid[snapshot[i].uid] = i + 1;
    }
    _users = _users
        .map((u) => u.copyWith(rank: rankByUid[u.uid] ?? u.rank))
        .toList();
  }

  @override
  void dispose() {
    if (_onUsers != null) {
      SocketService.I.offWithHandler('everyUser', _onUsers!);
    }
    if (_onStats != null) {
      SocketService.I.offWithHandler('AllUserStatistics', _onStats!);
    }
    if (_onError != null) {
      SocketService.I.offWithHandler('errorMessage', _onError!);
    }
    if (_onConnect != null) {
      SocketService.I.offWithHandler('connect', _onConnect!);
    }
    if (_onBlockedUsers != null) {
      SocketService.I.offWithHandler('blockedUsers', _onBlockedUsers!);
    }
    if (_onUsersWhoBlockedMe != null) {
      SocketService.I.offWithHandler(
        'usersWhoBlockedMe',
        _onUsersWhoBlockedMe!,
      );
    }
    if (_onUserBlocked != null) {
      SocketService.I.offWithHandler('userBlocked', _onUserBlocked!);
    }
    if (_onUserUnblocked != null) {
      SocketService.I.offWithHandler('userUnblocked', _onUserUnblocked!);
    }
    if (_onBlockedByUser != null) {
      SocketService.I.offWithHandler('blockedByUser', _onBlockedByUser!);
    }
    if (_onOnlineFriends != null) {
      SocketService.I.offWithHandler('onlineFriends', _onOnlineFriends!);
    }
    if (_onUserConnected != null) {
      SocketService.I.offWithHandler('userConnected', _onUserConnected!);
    }
    if (_onUserDisconnected != null) {
      SocketService.I.offWithHandler('userDisconnected', _onUserDisconnected!);
    }
    super.dispose();
  }

  List<LeaderboardUser> _parseUsers(dynamic data) {
    final list = <Map<String, dynamic>>[];
    if (data is List) {
      for (final e in data) {
        if (e is Map) list.add(Map<String, dynamic>.from(e));
      }
    } else if (data is Map) {
      for (final v in data.values) {
        if (v is Map) list.add(Map<String, dynamic>.from(v));
      }
    }
    return list.map(LeaderboardUser.fromJson).toList();
  }

  List<UserStats> _parseStats(dynamic data) {
    final list = <Map<String, dynamic>>[];
    if (data is List) {
      for (final e in data) {
        if (e is Map) list.add(Map<String, dynamic>.from(e));
      }
    } else if (data is Map) {
      if (data.containsKey('uid')) {
        list.add(Map<String, dynamic>.from(data));
      } else {
        for (final v in data.values) {
          if (v is Map) list.add(Map<String, dynamic>.from(v));
        }
      }
    }
    return list.map(UserStats.fromJson).toList();
  }

  Set<String> _extractBlockedMeUids(dynamic data) {
    final me = _selfUid;
    if (me == null || me.isEmpty) return <String>{};
    final list = <Map<String, dynamic>>[];
    try {
      if (data is List) {
        for (final e in data) {
          if (e is Map) list.add(Map<String, dynamic>.from(e));
        }
      } else if (data is Map) {
        for (final v in data.values) {
          if (v is Map) list.add(Map<String, dynamic>.from(v));
        }
      }
    } catch (_) {
      return <String>{};
    }
    final blockedMe = <String>{};
    for (final u in list) {
      final uid = (u['uid'] ?? '').toString();
      if (uid.isEmpty) continue;
      final arr = (u['blockedUsers'] as List?) ?? const [];
      final hasMe = arr.any((x) => (x?.toString() ?? '') == me);
      if (hasMe) blockedMe.add(uid);
    }
    return blockedMe;
  }

  Set<String> _extractBlockedByMeUids(dynamic data) {
    final me = _selfUid;
    if (me == null || me.isEmpty) return <String>{};
    final list = <Map<String, dynamic>>[];
    try {
      if (data is List) {
        for (final e in data) {
          if (e is Map) list.add(Map<String, dynamic>.from(e));
        }
      } else if (data is Map) {
        for (final v in data.values) {
          if (v is Map) list.add(Map<String, dynamic>.from(v));
        }
      }
    } catch (_) {
      return <String>{};
    }
    final meRecord = list.firstWhere(
      (u) => (u['uid'] ?? '').toString() == me,
      orElse: () => const {},
    );
    if (meRecord.isEmpty) return <String>{};
    final arr = (meRecord['blockedUsers'] as List?) ?? const [];
    return arr
        .map((e) => e?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .toSet();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          ThemedBackground(
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppHeader(
                    title: 'LEADERBOARDS_PAGE.TITLE'.tr(),
                    showRankings: false,
                    onBack: () => Navigator.of(context).maybePop(),
                    onTapShop: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const ShopPage()),
                      );
                    },
                    onTapSettings: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const SettingsPage()),
                      );
                    },
                    onTapLogout: () => performLogoutFlow(context),
                  ),
                  const Divider(color: Colors.white, height: 16, thickness: 1),
                  const SizedBox(height: 8),
                  Expanded(
                    child: _loading
                        ? const Center(
                            child: CircularProgressIndicator(
                              color: Colors.white70,
                            ),
                          )
                        : _error != null
                        ? Center(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Colors.redAccent,
                                fontSize: 16,
                              ),
                            ),
                          )
                        : _buildLeaderboardList(),
                  ),
                ],
              ),
            ),
          ),
          const ChatFriendsOverlay(),
        ],
      ),
    );
  }

  Widget _buildLeaderboardList() {
    if (_users.isEmpty) {
      return Center(
        child: Text(
          'LEADERBOARDS_PAGE.LOADING'.tr(),
          style: const TextStyle(color: Colors.white70),
        ),
      );
    }

    // Header + rows
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
          child: Row(
            children: [
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.RANK'.tr(),
                flex: 1,
                bold: true,
                header: true,
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.USERNAME'.tr(),
                flex: 4,
                bold: true,
                header: true,
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.LIFETIME_EARNINGS'.tr(),
                flex: 3,
                bold: true,
                header: true,
                sorted: _sortColumn == 'lifetimeEarnings',
                ascending: _sortAsc,
                onTap: () => setState(() => _sortUsers('lifetimeEarnings')),
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.GAMES_PLAYED'.tr(),
                flex: 2,
                bold: true,
                header: true,
                sorted: _sortColumn == 'gamesPlayed',
                ascending: _sortAsc,
                onTap: () => setState(() => _sortUsers('gamesPlayed')),
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.WINS'.tr(),
                flex: 2,
                bold: true,
                header: true,
                sorted: _sortColumn == 'wins',
                ascending: _sortAsc,
                onTap: () => setState(() => _sortUsers('wins')),
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.WINRATE'.tr(),
                flex: 3,
                bold: true,
                header: true,
                sorted: _sortColumn == 'winRate',
                ascending: _sortAsc,
                onTap: () => setState(() => _sortUsers('winRate')),
              ),
              LeaderboardCell(
                text: 'LEADERBOARDS_PAGE.TOTAL_GAME_DURATION'.tr(),
                flex: 3,
                bold: true,
                header: true,
                sorted: _sortColumn == 'duration',
                ascending: _sortAsc,
                onTap: () => setState(() => _sortUsers('duration')),
              ),
            ],
          ),
        ),
        const Divider(color: Colors.white24, height: 1),
        Expanded(
          child: ListView.separated(
            cacheExtent:
                2000, // keep more items alive offscreen to reduce reloads
            itemCount: _users.length,
            separatorBuilder: (_, __) =>
                const Divider(color: Colors.white12, height: 1),
            itemBuilder: (context, index) {
              final u = _users[index];
              final isSelf = _selfUid != null && _selfUid == u.uid;
              final iBlocked = _blockedByMe.contains(u.uid);
              final theyBlockedMe = _blockedMe.contains(u.uid);
              String displayName = u.displayName;
              if (iBlocked) {
                displayName = 'LEADERBOARDS_PAGE.BLOCKED_USER'.tr();
              } else if (theyBlockedMe) {
                displayName = 'LEADERBOARDS_PAGE.BLOCKED_ME'.tr();
              }
              return Container(
                decoration: isSelf
                    ? BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            const Color(
                              0xFFFFD700,
                            ).withValues(alpha: 0.16), // subtle gold
                            const Color(
                              0xFFFFD700,
                            ).withValues(alpha: 0.0), // fade to transparent
                          ],
                        ),
                      )
                    : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16.0,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      LeaderboardCell(
                        text: '',
                        flex: 1,
                        leading: _buildRankBadge(u.rank ?? index + 1),
                      ),
                      LeaderboardCell(
                        text: displayName,
                        flex: 4,
                        leading: _buildAvatar(
                          u,
                          blocked: iBlocked || theyBlockedMe,
                        ),
                      ),
                      LeaderboardCell(
                        text: '\$${u.lifetimeEarnings ?? 0}',
                        flex: 3,
                        usePrimaryColor: true,
                      ),
                      LeaderboardCell(text: '${u.totalGamesPlayed}', flex: 2),
                      LeaderboardCell(text: '${u.wins}', flex: 2),
                      LeaderboardCell(
                        text: '${u.winRate.toStringAsFixed(2)}%',
                        flex: 3,
                        below: _buildWinRateBar(u.winRate),
                      ),
                      LeaderboardCell(
                        text: _formatDuration(u.totalGameDurationSeconds),
                        flex: 3,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  String _formatDuration(int seconds) {
    if (seconds <= 0) return '00:00:00';
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(h)}:${two(m)}:${two(s)}';
  }

  Widget _buildAvatar(LeaderboardUser u, {bool blocked = false}) {
    const double size = 48;
    if (blocked) {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          const CircleAvatar(
            radius: size / 2,
            backgroundColor: Color(0xFF5A5A5A), // plain gray placeholder
          ),
          _buildActivityDot(u.uid),
        ],
      );
    }
    final path = (u.avatarURL ?? '').trim();
    if (path.isEmpty) {
      final ch = _initialsFrom(u.displayName);
      return Stack(
        clipBehavior: Clip.none,
        children: [
          CircleAvatar(
            radius: size / 2,
            backgroundColor: Colors.white24,
            child: Text(
              ch,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          _buildActivityDot(u.uid),
        ],
      );
    }
    final isNetwork = path.startsWith('http://') || path.startsWith('https://');
    if (isNetwork) {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          ClipOval(
            child: CachedNetworkImage(
              imageUrl: path,
              width: size,
              height: size,
              fit: BoxFit.cover,
              fadeInDuration: const Duration(milliseconds: 120),
              memCacheHeight: 96, // hint to reduce memory pressure
              memCacheWidth: 96,
              placeholder: (_, __) =>
                  Container(width: size, height: size, color: Colors.white10),
              errorWidget: (_, __, ___) => CircleAvatar(
                radius: size / 2,
                backgroundColor: Colors.white24,
                child: Text(
                  _initialsFrom(u.displayName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          _buildActivityDot(u.uid),
        ],
      );
    }
    return Stack(
      clipBehavior: Clip.none,
      children: [
        ClipOval(
          child: Image.asset(
            path,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => CircleAvatar(
              radius: size / 2,
              backgroundColor: Colors.white24,
              child: Text(
                _initialsFrom(u.displayName),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
        _buildActivityDot(u.uid),
      ],
    );
  }

  Widget _buildActivityDot(String uid) {
    final bool hasStatus = _onlineStatuses.containsKey(uid);
    final bool isOnline = _onlineStatuses[uid] == true;
    final Color color = hasStatus
        ? (isOnline ? Colors.green : Colors.red)
        : Colors.grey;
    return Positioned(
      bottom: -2,
      right: -2,
      child: Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          border: Border.all(color: Colors.black, width: 1.2),
          boxShadow: const [
            BoxShadow(
              color: Colors.black45,
              blurRadius: 3,
              offset: Offset(0, 1),
            ),
          ],
        ),
      ),
    );
  }

  String? _extractUid(dynamic data) {
    try {
      if (data is Map) {
        final m = Map<String, dynamic>.from(data);
        final v = m['uid'];
        if (v is String) return v;
      }
      if (data is String) return data;
    } catch (_) {}
    return null;
  }

  Future<void> _prefetchAvatars() async {
    try {
      final urls = _users
          .map((u) => (u.avatarURL ?? '').trim())
          .where((p) => p.startsWith('http://') || p.startsWith('https://'))
          .toSet()
          .toList();
      if (urls.isEmpty) return;

      final manager = DefaultCacheManager();
      for (final url in urls) {
        manager.getSingleFile(url).ignore();
      }
    } catch (_) {}
  }

  String _initialsFrom(String name) {
    final n = name.trim();
    if (n.isEmpty) return '?';
    return n.characters.first.toUpperCase();
  }

  Widget _buildRankBadge(int rank) {
    const double size = 28;
    BoxDecoration decoration;
    switch (rank) {
      case 1:
        decoration = const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFF59D), Color(0xFFFFC107)],
          ),
          boxShadow: [
            BoxShadow(color: Color(0x33FFC107), blurRadius: 6, spreadRadius: 1),
          ],
        );
        break;
      case 2:
        decoration = const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE0E0E0), Color(0xFFBDBDBD)],
          ),
        );
        break;
      case 3:
        decoration = const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFD7A86E), Color(0xFFB87333)],
          ),
        );
        break;
      default:
        decoration = BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.10),
        );
    }

    return Container(
      width: size,
      height: size,
      decoration: decoration,
      alignment: Alignment.center,
      child: Text(
        '$rank',
        style: TextStyle(
          fontWeight: FontWeight.w700,
          color: rank <= 3
              ? Colors.black.withValues(alpha: 0.9)
              : Colors.white.withValues(alpha: 0.85),
        ),
      ),
    );
  }

  Widget _buildWinRateBar(double winRate) {
    final pct = (winRate.clamp(0, 100)) / 100.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxBarWidth =
            constraints.maxWidth * 0.85; // avoid full width of column
        final filled = maxBarWidth * pct;
        return ValueListenableBuilder<ThemePalette>(
          valueListenable: ThemeConfig.palette,
          builder: (context, palette, _) {
            return Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: maxBarWidth,
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: palette.secondaryDark.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      width: filled,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [palette.primaryLight, palette.primary],
                        ),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
